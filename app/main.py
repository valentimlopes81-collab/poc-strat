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
def _stats(trades: list[Trade]) -> dict:
    closed = [t for t in trades if t.status == TradeStatus.closed]
    wins = [t for t in closed if t.realized_pnl > 0]
    total_pnl = sum(t.realized_pnl for t in trades)
    equity = settings.account_start_usd + total_pnl
    return {
        "equity": equity,
        "total_pnl": total_pnl,
        "n_closed": len(closed),
        "n_open": len([t for t in trades if t.status == TradeStatus.open]),
        "n_pending": len([t for t in trades if t.status == TradeStatus.pending]),
        "win_rate": (len(wins) / len(closed) * 100.0) if closed else 0.0,
    }


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request) -> HTMLResponse:
    with get_session() as session:
        trades = list(session.exec(select(Trade).order_by(Trade.created_at.desc())))
        return templates.TemplateResponse(
            request,
            "dashboard.html",
            {"trades": trades, "stats": _stats(trades), "start": settings.account_start_usd},
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
