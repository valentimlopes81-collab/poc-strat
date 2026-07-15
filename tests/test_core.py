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
def test_long_entries_are_supports_below():
    # Long: entradas nos suportes abaixo ao alcance; alvos nas resistências acima.
    p = AlertPayload(ticker="X.P", side="long", price=100,
                     zone_pocs=[], targets_up=[104, 108, 112],
                     targets_down=[99, 98, 90], zone_break=0.0001)
    plan = build_plan(p)
    assert plan is not None
    # 99 (1%) e 98 (2%) dentro de reach 3%; 90 (10%) fora -> só esses dois entram
    assert sorted(e.price for e in plan.entries) == [98, 99]
    # POC seguinte (90) está a >max_stop_pct -> stop corta no limite (1.5% abaixo do 98)
    assert abs(plan.stop - 98 * (1 - 0.015)) < 1e-6
    # alvos = resistências acima, >1%, mais próximo primeiro
    assert [t.price for t in plan.targets] == [104, 108, 112]
    assert [round(t.close_fraction, 2) for t in plan.targets] == [0.30, 0.40, 0.30]


def test_short_like_aave_sells_into_resistance():
    # Reproduz o setup AAVE: short com resistências acima e suportes longe abaixo.
    p = AlertPayload(ticker="AAVEUSDT.P", side="short", price=100,
                     zone_pocs=[], targets_up=[101.76, 102.11, 103.67, 104.69],
                     targets_down=[94.38, 93.61], zone_break=101)
    plan = build_plan(p)
    assert plan is not None
    # entradas = resistências ao alcance (101.76, 102.11); as outras > 3% ficam de fora
    assert [round(e.price, 2) for e in plan.entries] == [101.76, 102.11]
    # 103.67 está logo além do limite de 1.5% -> stop corta no limite (risco controlado)
    assert abs(plan.stop - 102.11 * 1.015) < 1e-6
    # alvos = suportes abaixo
    assert [t.price for t in plan.targets] == [94.38, 93.61]


def test_no_entry_zone_returns_none():
    # Long mas o único suporte está a 10% -> fora de alcance -> sem setup.
    p = AlertPayload(ticker="X.P", side="long", price=100,
                     zone_pocs=[], targets_up=[105], targets_down=[90], zone_break=0.0001)
    assert build_plan(p) is None


def test_targets_below_1pct_are_dropped():
    p = AlertPayload(ticker="X.P", side="long", price=100,
                     zone_pocs=[], targets_up=[100.5, 104], targets_down=[99, 96], zone_break=0.0001)
    plan = build_plan(p)
    # entrada ~99; alvo 100.5 está a ~1.5% de 99 -> conta; recalcular: usa >1% do avg(99)
    # 100.5 -> 1.51% (>1%) mantém; garantimos que nenhum <1% passa
    for t in plan.targets:
        assert abs(t.price - plan.planned_avg_entry) / plan.planned_avg_entry * 100.0 >= 1.0


# --------------------------- engine ---------------------------------------
def test_long_take_profit_lifecycle():
    s = _session()
    p = AlertPayload(ticker="BTCUSDT.P", side="long", price=100,
                     zone_pocs=[], targets_up=[102], targets_down=[99, 90], zone_break=0.0001)
    plan = build_plan(p)  # entrada 99, stop 90 -> stop_dist 9 -> qty=100/9
    trade = create_trade_from_plan(s, p, plan)
    qty = plan.total_qty

    process_tick(s, trade, MarketTick(trade.symbol, 99, 99.5, 99.0, 99.2))  # fill @99
    assert trade.status == TradeStatus.open
    assert abs(trade.avg_entry - 99) < 1e-9

    process_tick(s, trade, MarketTick(trade.symbol, 101.5, 102.0, 101.0, 101.5))  # TP @102
    assert trade.status == TradeStatus.closed
    assert trade.close_reason == CloseReason.take_profit
    assert abs(trade.realized_pnl - (102 - 99) * qty) < 1e-6


def test_long_zone_break_cut():
    s = _session()
    p = AlertPayload(ticker="ETHUSDT.P", side="long", price=100,
                     zone_pocs=[], targets_up=[110], targets_down=[99, 90], zone_break=0.0001)
    plan = build_plan(p)  # entrada 99, stop 90
    trade = create_trade_from_plan(s, p, plan)
    qty = plan.total_qty
    process_tick(s, trade, MarketTick(trade.symbol, 99, 99.5, 99.0, 99.2))  # fill
    process_tick(s, trade, MarketTick(trade.symbol, 88, 99.0, 87.5, 88.0))  # fecha < stop 90
    assert trade.status == TradeStatus.closed
    assert trade.close_reason == CloseReason.zone_break
    assert abs(trade.realized_pnl - (88 - 99) * qty) < 1e-6


def test_short_partial_then_full_tp():
    s = _session()
    p = AlertPayload(ticker="SOLUSDT.P", side="short", price=100,
                     zone_pocs=[], targets_up=[101, 110], targets_down=[98, 96, 90], zone_break=101)
    plan = build_plan(p)  # entrada 101, stop 110
    trade = create_trade_from_plan(s, p, plan)
    qty = plan.total_qty
    avg = plan.planned_avg_entry  # 101

    process_tick(s, trade, MarketTick(trade.symbol, 101, 101.0, 100.5, 100.8))  # fill @101
    assert trade.status == TradeStatus.open

    process_tick(s, trade, MarketTick(trade.symbol, 98, 100.0, 98.0, 98.5))  # TP1 98 (30%)
    assert trade.status == TradeStatus.open
    assert abs(trade.realized_pnl - (avg - 98) * 0.30 * qty) < 1e-6

    process_tick(s, trade, MarketTick(trade.symbol, 90, 97.0, 90.0, 91.0))  # TP2 96 + TP3 90
    assert trade.status == TradeStatus.closed
    expected = ((avg - 98) * 0.30 + (avg - 96) * 0.40 + (avg - 90) * 0.30) * qty
    assert abs(trade.realized_pnl - expected) < 1e-6


def test_entry_expires_unfilled():
    import datetime as dt
    s = _session()
    p = AlertPayload(ticker="XRPUSDT.P", side="long", price=100,
                     zone_pocs=[], targets_up=[110], targets_down=[99, 90], zone_break=0.0001)
    plan = build_plan(p)
    trade = create_trade_from_plan(s, p, plan)
    trade.expires_at = dt.datetime.utcnow() - dt.timedelta(minutes=1)
    process_tick(s, trade, MarketTick(trade.symbol, 105, 106, 104, 105))  # nunca tocou 99
    assert trade.status == TradeStatus.cancelled
    assert trade.close_reason == CloseReason.expired
