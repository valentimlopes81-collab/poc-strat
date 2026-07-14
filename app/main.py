"""Aplicação FastAPI: recebe webhooks do TradingView, corre o loop de paper
trading em segundo plano e serve o dashboard."""
from __future__ import annotations

import asyncio
import contextlib
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import select

from .config import settings
from .db import get_session, init_db
from .engine import create_trade_from_plan, process_tick
from .feed import get_ticks, make_exchange
from .models import Trade, TradeStatus
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


def _stats(trades: list[Trade]) -> dict:
    closed = [t for t in trades if t.status == TradeStatus.closed]
    wins = [t for t in closed if t.realized_pnl > 0]
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
        "win_rate": (len(wins) / len(closed) * 100.0) if closed else 0.0,
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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
