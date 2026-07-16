"""Motor de paper trading: ciclo de vida das ordens sobre dados de mercado.

Fills realistas — uma ordem limite só é preenchida se o preço realmente tocar
o nível (usando o máximo/mínimo da vela). O corte por ``zone_break`` só ocorre
quando uma vela do timeframe de referência FECHA para lá do nível.
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlmodel import Session, select

from .config import Settings, settings as default_settings
from .models import CloseReason, EntryOrder, Target, Trade, TradeStatus, utcnow
from .schemas import AlertPayload
from .strategy import TradePlan


@dataclass
class MarketTick:
    """Fotografia de mercado para um símbolo, vinda do feed."""
    symbol: str
    last: float
    bar_high: float   # máximo da última vela (deteta wicks nos fills)
    bar_low: float    # mínimo da última vela
    bar_close: float  # fecho da última vela CONFIRMADA (valida o corte)


def to_ccxt_symbol(base: str, s: Settings) -> str:
    """BTC -> BTC/USDT:USDT (perpétuo linear na Bybit)."""
    return f"{base}/{s.quote}:{s.quote}"


def create_trade_from_plan(
    session: Session, payload: AlertPayload, plan: TradePlan, s: Settings | None = None
) -> Trade:
    s = s or default_settings
    now = utcnow()
    trade = Trade(
        symbol=to_ccxt_symbol(payload.symbol_base(), s),
        ticker_raw=payload.ticker,
        side=plan.side,
        status=TradeStatus.pending,
        planned_avg_entry=plan.planned_avg_entry,
        stop=plan.stop,
        risk_usd=plan.risk_usd,
        total_qty=plan.total_qty,
        remaining_qty=0.0,
        signal_price=payload.price,
    )
    session.add(trade)
    session.commit()
    session.refresh(trade)

    for e in plan.entries:
        session.add(EntryOrder(trade_id=trade.id, price=e.price, qty=e.qty))
    for rank, t in enumerate(plan.targets, start=1):
        session.add(
            Target(trade_id=trade.id, rank=rank, price=t.price, close_fraction=t.close_fraction)
        )
    session.commit()
    session.refresh(trade)
    return trade


def _recompute_entry(session: Session, trade: Trade) -> None:
    filled = [e for e in _entries(session, trade) if e.filled]
    qty = sum(e.qty for e in filled)
    if qty > 0:
        trade.avg_entry = sum(e.price * e.qty for e in filled) / qty
    prev_filled = trade.filled_qty
    trade.filled_qty = qty
    # Aumenta a posição aberta apenas com a quantidade recém-preenchida.
    trade.remaining_qty += max(0.0, qty - prev_filled)


def _entries(session: Session, trade: Trade) -> list[EntryOrder]:
    return list(session.exec(select(EntryOrder).where(EntryOrder.trade_id == trade.id)))


def _targets(session: Session, trade: Trade) -> list[Target]:
    return list(
        session.exec(select(Target).where(Target.trade_id == trade.id).order_by(Target.rank))
    )


def _pnl_per_unit(side: str, exit_price: float, avg: float) -> float:
    return (exit_price - avg) if side == "long" else (avg - exit_price)


def process_tick(
    session: Session, trade: Trade, tick: MarketTick, s: Settings | None = None
) -> None:
    """Avança o estado de UM trade dado o tick de mercado do seu símbolo."""
    s = s or default_settings
    now = utcnow()
    if trade.status in (TradeStatus.closed, TradeStatus.cancelled):
        return

    trade.last_price = tick.last  # para o PnL live no dashboard

    # --- 1. Fills das ordens limite (um fill tem prioridade sobre o cancelamento) ---
    for e in _entries(session, trade):
        if e.filled:
            continue
        hit = (trade.side == "long" and tick.bar_low <= e.price) or (
            trade.side == "short" and tick.bar_high >= e.price
        )
        if hit:
            e.filled = True
            e.filled_at = now
            session.add(e)
    _recompute_entry(session, trade)
    if trade.filled_qty > 0 and trade.status == TradeStatus.pending:
        trade.status = TradeStatus.open
        trade.opened_at = now

    # --- 2. Cancelamento por FRONT-RUN: o preço fugiu da zona na direção do
    # lucro (sem encher) mais do que cancel_move_pct, medido do preço do alerta.
    if trade.status == TradeStatus.pending and trade.signal_price > 0:
        thr = s.cancel_move_pct / 100.0
        ran_away = (trade.side == "long" and tick.bar_high >= trade.signal_price * (1 + thr)) or (
            trade.side == "short" and tick.bar_low <= trade.signal_price * (1 - thr)
        )
        if ran_away:
            trade.status = TradeStatus.cancelled
            trade.close_reason = CloseReason.runaway
            trade.closed_at = now
            session.add(trade)
            session.commit()
            return

    # A partir daqui só interessa se há posição aberta.
    if trade.status != TradeStatus.open or trade.remaining_qty <= 0:
        session.add(trade)
        session.commit()
        return

    # --- 3. Corte por zone_break (fecho de vela para lá do stop) ---
    broke = (trade.side == "long" and tick.bar_close < trade.stop) or (
        trade.side == "short" and tick.bar_close > trade.stop
    )
    if broke:
        exit_price = tick.bar_close
        trade.realized_pnl += _pnl_per_unit(trade.side, exit_price, trade.avg_entry) * trade.remaining_qty
        trade.remaining_qty = 0.0
        trade.status = TradeStatus.closed
        trade.close_reason = CloseReason.zone_break
        trade.closed_at = now
        session.add(trade)
        session.commit()
        return

    # --- 4. Take profits (fecho parcial em cada zona seguinte) ---
    for t in _targets(session, trade):
        if t.hit:
            continue
        reached = (trade.side == "long" and tick.bar_high >= t.price) or (
            trade.side == "short" and tick.bar_low <= t.price
        )
        if not reached:
            continue
        qty_close = min(trade.remaining_qty, t.close_fraction * trade.filled_qty)
        if qty_close <= 0:
            continue
        trade.realized_pnl += _pnl_per_unit(trade.side, t.price, trade.avg_entry) * qty_close
        trade.remaining_qty -= qty_close
        t.hit = True
        t.hit_at = now
        session.add(t)

    if trade.remaining_qty <= 1e-12:
        trade.remaining_qty = 0.0
        trade.status = TradeStatus.closed
        trade.close_reason = CloseReason.take_profit
        trade.closed_at = now

    session.add(trade)
    session.commit()
