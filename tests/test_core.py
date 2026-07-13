"""Testes da lógica central: strategy (puro) + engine (ciclo de vida)."""
from __future__ import annotations

from sqlmodel import Session, SQLModel, create_engine

from app.engine import MarketTick, create_trade_from_plan, process_tick
from app.models import CloseReason, TradeStatus
from app.schemas import AlertPayload
from app.strategy import build_plan


def _session() -> Session:
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(eng)
    return Session(eng)


# --------------------------- strategy -------------------------------------
def test_plan_sizing_and_split():
    p = AlertPayload(ticker="BTCUSDT.P", side="long", price=101,
                     zone_pocs=[100, 101, 102], targets_up=[104, 105, 110],
                     targets_down=[], zone_break=99)
    plan = build_plan(p)
    assert plan is not None
    assert plan.planned_avg_entry == 101
    # risco 100 (2% de 5k), stop_dist = 101-99 = 2 -> qty = 50
    assert abs(plan.total_qty - 50.0) < 1e-9
    assert len(plan.entries) == 3
    assert [round(t.close_fraction, 2) for t in plan.targets] == [0.30, 0.40, 0.30]
    assert [t.price for t in plan.targets] == [104, 105, 110]


def test_targets_below_1pct_are_dropped():
    p = AlertPayload(ticker="BTCUSDT.P", side="long", price=101,
                     zone_pocs=[101], targets_up=[101.5, 104], targets_down=[], zone_break=100)
    plan = build_plan(p)
    # 101.5 está a ~0.5% -> descartado; sobra só 104 -> fração renormaliza para 1.0
    assert [t.price for t in plan.targets] == [104]
    assert abs(plan.targets[0].close_fraction - 1.0) < 1e-9


def test_invalid_stop_side_rejected():
    # long com stop ACIMA do preço médio -> incoerente
    p = AlertPayload(ticker="BTCUSDT.P", side="long", price=100,
                     zone_pocs=[100], targets_up=[110], targets_down=[], zone_break=105)
    assert build_plan(p) is None


# --------------------------- engine ---------------------------------------
def test_long_take_profit_lifecycle():
    s = _session()
    p = AlertPayload(ticker="BTCUSDT.P", side="long", price=100,
                     zone_pocs=[100], targets_up=[102], targets_down=[], zone_break=99)
    plan = build_plan(p)  # qty = 100/1 = 100
    trade = create_trade_from_plan(s, p, plan)

    # tick 1: preço toca 100 -> fill
    process_tick(s, trade, MarketTick(trade.symbol, 100, 100.5, 100.0, 100.2))
    assert trade.status == TradeStatus.open
    assert abs(trade.avg_entry - 100) < 1e-9
    assert abs(trade.remaining_qty - 100) < 1e-9

    # tick 2: máximo toca 102 -> TP total
    process_tick(s, trade, MarketTick(trade.symbol, 101.5, 102.0, 101.0, 101.5))
    assert trade.status == TradeStatus.closed
    assert trade.close_reason == CloseReason.take_profit
    assert abs(trade.realized_pnl - 200.0) < 1e-9  # (102-100)*100


def test_long_zone_break_cut():
    s = _session()
    p = AlertPayload(ticker="ETHUSDT.P", side="long", price=100,
                     zone_pocs=[100], targets_up=[110], targets_down=[], zone_break=99)
    plan = build_plan(p)
    trade = create_trade_from_plan(s, p, plan)
    process_tick(s, trade, MarketTick(trade.symbol, 100, 100.5, 100.0, 100.2))  # fill
    # vela FECHA a 98 (< stop 99) -> corte
    process_tick(s, trade, MarketTick(trade.symbol, 98, 100.0, 97.5, 98.0))
    assert trade.status == TradeStatus.closed
    assert trade.close_reason == CloseReason.zone_break
    assert abs(trade.realized_pnl - (-200.0)) < 1e-9  # (98-100)*100


def test_short_partial_then_full_tp():
    s = _session()
    p = AlertPayload(ticker="SOLUSDT.P", side="short", price=100,
                     zone_pocs=[100], targets_up=[], targets_down=[98, 96, 90], zone_break=101)
    plan = build_plan(p)  # stop_dist=1 -> qty=100; targets 98,96,90 fracs .3/.4/.3
    trade = create_trade_from_plan(s, p, plan)
    process_tick(s, trade, MarketTick(trade.symbol, 100, 100.0, 99.5, 99.8))  # short fill (high>=100)
    assert trade.status == TradeStatus.open

    # atinge só o TP1 (98): fecha 30% de 100 = 30 qty, pnl=(100-98)*30=60
    process_tick(s, trade, MarketTick(trade.symbol, 98, 99.0, 98.0, 98.5))
    assert trade.status == TradeStatus.open
    assert abs(trade.remaining_qty - 70) < 1e-9
    assert abs(trade.realized_pnl - 60.0) < 1e-9

    # atinge TP2 (96) e TP3 (90) na mesma vela -> fecha resto
    process_tick(s, trade, MarketTick(trade.symbol, 90, 98.0, 90.0, 91.0))
    assert trade.status == TradeStatus.closed
    # +40 qty@96 => (100-96)*40=160 ; +30 qty@90 => (100-90)*30=300 ; total 60+160+300=520
    assert abs(trade.realized_pnl - 520.0) < 1e-9


def test_entry_expires_unfilled():
    import datetime as dt
    s = _session()
    p = AlertPayload(ticker="XRPUSDT.P", side="long", price=100,
                     zone_pocs=[100], targets_up=[110], targets_down=[], zone_break=99)
    plan = build_plan(p)
    trade = create_trade_from_plan(s, p, plan)
    # força expiração
    trade.expires_at = dt.datetime.utcnow() - dt.timedelta(minutes=1)
    # preço nunca tocou (bar_low > 100)
    process_tick(s, trade, MarketTick(trade.symbol, 105, 106, 104, 105))
    assert trade.status == TradeStatus.cancelled
    assert trade.close_reason == CloseReason.expired
