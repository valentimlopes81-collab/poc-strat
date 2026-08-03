"""Aplicação FastAPI: recebe webhooks do TradingView, corre o loop de paper
trading em segundo plano e serve o dashboard."""
from __future__ import annotations

import asyncio
import contextlib
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import select

from .config import settings
from .db import get_session, init_db
from .engine import create_trade_from_plan, process_tick
from .feed import get_ticks, make_exchange
from .models import CloseReason, EntryOrder, Target, Trade, TradeStatus
from .schemas import AlertPayload
from .strategy import build_plan

app = FastAPI(title="POC Strat — Paper Trading")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "dashboard" / "templates"))


# --------------------------------------------------------------------------
# Loop de mercado
# --------------------------------------------------------------------------
async def market_loop() -> None:
    ex = await asyncio.to_thread(make_exchange)
    while True:
        try:
            with get_session() as session:
                active = list(
                    session.exec(
                        select(Trade).where(
                            Trade.status.in_([TradeStatus.pending, TradeStatus.open])
                        )
                    )
                )
                symbols = sorted({t.symbol for t in active})
                if symbols:
                    ticks = await asyncio.to_thread(get_ticks, ex, symbols)
                    for trade in active:
                        tick = ticks.get(trade.symbol)
                        if tick:
                            process_tick(session, trade, tick)
        except Exception as exc:  # nunca deixar o loop morrer
            print(f"[market_loop] erro: {exc}")
        await asyncio.sleep(settings.poll_interval_sec)


@app.on_event("startup")
async def _startup() -> None:
    init_db()
    app.state.loop_task = asyncio.create_task(market_loop())


@app.on_event("shutdown")
async def _shutdown() -> None:
    task = getattr(app.state, "loop_task", None)
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


# --------------------------------------------------------------------------
# Webhook do TradingView
# --------------------------------------------------------------------------
@app.post("/webhook")
async def webhook(req: Request) -> JSONResponse:
    raw = await req.body()
    try:
        payload = AlertPayload.model_validate_json(raw)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"payload inválido: {exc}")

    if settings.webhook_secret and payload.secret != settings.webhook_secret:
        raise HTTPException(status_code=401, detail="segredo inválido")

    plan = build_plan(payload)
    if plan is None:
        return JSONResponse({"status": "rejected", "reason": "plano inválido (dados incoerentes)"})

    with get_session() as session:
        trade = create_trade_from_plan(session, payload, plan)
        return JSONResponse(
            {
                "status": "accepted",
                "trade_id": trade.id,
                "symbol": trade.symbol,
                "side": trade.side,
                "entries": len(plan.entries),
                "targets": [t.price for t in plan.targets],
                "stop": plan.stop,
                "qty": round(plan.total_qty, 6),
            }
        )


# --------------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------------
def _unrealized(trade: Trade) -> float:
    """PnL a flutuar de uma posição aberta, ao último preço visto."""
    if trade.status != TradeStatus.open or trade.remaining_qty <= 0 or trade.last_price <= 0:
        return 0.0
    diff = (trade.last_price - trade.avg_entry) if trade.side == "long" else (trade.avg_entry - trade.last_price)
    return diff * trade.remaining_qty


def _display_pnl(trade: Trade) -> float:
    """PnL a mostrar: realizado + não-realizado (o flutuante das abertas)."""
    return trade.realized_pnl + _unrealized(trade)


def _outcome(t: Trade) -> str:
    """win / loss / scratch. Uma trade fechada em breakeven não é loss:
    se deu lucro (ex.: bateu um TP antes) conta win; senão é 'scratch'."""
    if t.realized_pnl > 1e-9:
        return "win"
    if t.close_reason == CloseReason.breakeven:
        return "scratch"
    if t.realized_pnl < -1e-9:
        return "loss"
    return "scratch"


def _stats(trades: list[Trade]) -> dict:
    closed = [t for t in trades if t.status == TradeStatus.closed]
    wins = [t for t in closed if _outcome(t) == "win"]
    losses = [t for t in closed if _outcome(t) == "loss"]
    decisive = len(wins) + len(losses)
    realized = sum(t.realized_pnl for t in trades)
    unrealized = sum(_unrealized(t) for t in trades)
    equity = settings.account_start_usd + realized + unrealized
    return {
        "equity": equity,
        "total_pnl": realized + unrealized,
        "realized": realized,
        "unrealized": unrealized,
        "n_closed": len(closed),
        "n_open": len([t for t in trades if t.status == TradeStatus.open]),
        "n_pending": len([t for t in trades if t.status == TradeStatus.pending]),
        "win_rate": (len(wins) / decisive * 100.0) if decisive else 0.0,
    }


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request) -> HTMLResponse:
    with get_session() as session:
        trades = list(session.exec(select(Trade).order_by(Trade.created_at.desc())))
        pnl = {t.id: _display_pnl(t) for t in trades}
        live = {t.id for t in trades if t.status == TradeStatus.open and t.remaining_qty > 0}
        return templates.TemplateResponse(
            request,
            "dashboard.html",
            {
                "trades": trades,
                "pnl": pnl,
                "live": live,
                "stats": _stats(trades),
                "start": settings.account_start_usd,
            },
        )


@app.get("/api/trades")
async def api_trades() -> JSONResponse:
    with get_session() as session:
        trades = list(session.exec(select(Trade).order_by(Trade.created_at.desc())))
        return JSONResponse(
            {
                "stats": _stats(trades),
                "trades": [t.model_dump(mode="json") for t in trades],
            }
        )


# --------------------------------------------------------------------------
# Detalhe de uma trade
# --------------------------------------------------------------------------
def _r_multiple(trade: Trade) -> float | None:
    return (trade.realized_pnl / trade.risk_usd) if trade.risk_usd else None


@app.get("/trade/{trade_id}", response_class=HTMLResponse)
async def trade_detail(request: Request, trade_id: int) -> HTMLResponse:
    with get_session() as session:
        trade = session.get(Trade, trade_id)
        if trade is None:
            raise HTTPException(status_code=404, detail="trade não encontrada")
        entries = list(session.exec(select(EntryOrder).where(EntryOrder.trade_id == trade_id)))
        targets = list(
            session.exec(select(Target).where(Target.trade_id == trade_id).order_by(Target.rank))
        )
        return templates.TemplateResponse(
            request,
            "trade_detail.html",
            {
                "t": trade,
                "entries": sorted(entries, key=lambda e: e.price, reverse=(trade.side == "short")),
                "targets": targets,
                "unrealized": _unrealized(trade),
                "display_pnl": _display_pnl(trade),
                "r_mult": _r_multiple(trade),
                "start": settings.account_start_usd,
            },
        )


# --------------------------------------------------------------------------
# Estatísticas (com filtro por período)
# --------------------------------------------------------------------------
def _period_cutoff(period: str) -> datetime | None:
    now = datetime.utcnow()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "7d":
        return now - timedelta(days=7)
    if period == "30d":
        return now - timedelta(days=30)
    return None  # "all"


def _side_wr(rows: list[Trade]) -> float:
    w = len([t for t in rows if _outcome(t) == "win"])
    d = w + len([t for t in rows if _outcome(t) == "loss"])
    return (w / d * 100.0) if d else 0.0


def _compute_stats(closed: list[Trade]) -> dict:
    n = len(closed)
    wins = [t for t in closed if _outcome(t) == "win"]
    losses = [t for t in closed if _outcome(t) == "loss"]
    scratches = [t for t in closed if _outcome(t) == "scratch"]
    decisive = len(wins) + len(losses)
    gross_profit = sum(t.realized_pnl for t in wins)
    gross_loss = -sum(t.realized_pnl for t in losses)  # positivo (só perdas reais)
    total = sum(t.realized_pnl for t in closed)
    rs = [t.realized_pnl / t.risk_usd for t in closed if t.risk_usd]
    longs = [t for t in closed if t.side == "long"]
    shorts = [t for t in closed if t.side == "short"]

    by_reason: dict[str, int] = {}
    for t in closed:
        key = t.close_reason.value if t.close_reason else "—"
        by_reason[key] = by_reason.get(key, 0) + 1

    by_symbol: dict[str, dict] = {}
    for t in closed:
        d = by_symbol.setdefault(t.symbol, {"n": 0, "pnl": 0.0, "wins": 0})
        d["n"] += 1
        d["pnl"] += t.realized_pnl
        d["wins"] += 1 if _outcome(t) == "win" else 0

    # Curva de equity: PnL cumulativo pelas trades fechadas, por data de fecho.
    ordered = sorted(closed, key=lambda t: t.closed_at or t.created_at)
    curve, cum = [], 0.0
    for t in ordered:
        cum += t.realized_pnl
        curve.append(cum)

    # Max drawdown (em $) sobre a curva, a partir de um pico inicial de 0.
    peak, max_dd = 0.0, 0.0
    for v in curve:
        peak = max(peak, v)
        max_dd = max(max_dd, peak - v)

    return {
        "n": n,
        "wins": len(wins),
        "losses": len(losses),
        "scratches": len(scratches),
        "win_rate": (len(wins) / decisive * 100.0) if decisive else 0.0,
        "total_pnl": total,
        "gross_profit": gross_profit,
        "gross_loss": gross_loss,
        "profit_factor": (gross_profit / gross_loss) if gross_loss > 0 else None,
        "avg_r": (sum(rs) / len(rs)) if rs else 0.0,
        "expectancy_usd": (total / n) if n else 0.0,
        "max_drawdown": max_dd,
        "avg_win": (gross_profit / len(wins)) if wins else 0.0,
        "avg_loss": (-gross_loss / len(losses)) if losses else 0.0,
        "best": max((t.realized_pnl for t in closed), default=0.0),
        "worst": min((t.realized_pnl for t in closed), default=0.0),
        "by_reason": dict(sorted(by_reason.items(), key=lambda kv: -kv[1])),
        "by_symbol": dict(sorted(by_symbol.items(), key=lambda kv: kv[1]["pnl"], reverse=True)),
        "n_long": len(longs),
        "n_short": len(shorts),
        "wr_long": _side_wr(longs),
        "wr_short": _side_wr(shorts),
        "curve": curve,
    }


@app.get("/stats", response_class=HTMLResponse)
async def stats_page(request: Request, period: str = "all") -> HTMLResponse:
    if period not in ("today", "7d", "30d", "all"):
        period = "all"
    cutoff = _period_cutoff(period)
    with get_session() as session:
        all_trades = list(session.exec(select(Trade)))

    closed = [t for t in all_trades if t.status == TradeStatus.closed]
    if cutoff is not None:
        closed = [t for t in closed if (t.closed_at or t.created_at) >= cutoff]
        created = [t for t in all_trades if t.created_at >= cutoff]
    else:
        created = all_trades

    stats = _compute_stats(closed)

    # Taxa de fill: dos setups que resolveram (encheram ou cancelaram), quantos encheram.
    filled = [t for t in created if t.status in (TradeStatus.open, TradeStatus.closed)]
    cancelled = [t for t in created if t.status == TradeStatus.cancelled]
    resolved = len(filled) + len(cancelled)
    stats["fill_rate"] = (len(filled) / resolved * 100.0) if resolved else 0.0
    stats["n_filled"] = len(filled)
    stats["n_cancelled"] = len(cancelled)

    return templates.TemplateResponse(
        request,
        "stats.html",
        {"stats": stats, "period": period, "start": settings.account_start_usd},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
