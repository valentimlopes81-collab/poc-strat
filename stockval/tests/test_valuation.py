"""Testes da matemática de valuation (puro, sem rede)."""
from __future__ import annotations

from app.config import Assumptions
from app.valuation import Fundamentals, cagr, cost_of_equity, two_stage_dcf, value_company, wacc


def test_cost_of_equity():
    assert abs(cost_of_equity(0.04, 1.0, 0.05) - 0.09) < 1e-9
    assert abs(cost_of_equity(0.04, 1.5, 0.05) - 0.115) < 1e-9


def test_cagr():
    assert abs(cagr([100, 110, 121]) - 0.10) < 1e-9
    assert cagr([100]) is None
    assert cagr([-1, 10]) is None  # sinais inválidos


def test_two_stage_dcf_value():
    ev = two_stage_dcf(100.0, 0.08, 10, 0.025, 0.09)
    assert ev is not None
    assert abs(ev - 2389.0) < 15  # confere com o cálculo manual (~2389)


def test_two_stage_dcf_invalid_when_wacc_le_terminal():
    assert two_stage_dcf(100.0, 0.08, 10, 0.05, 0.05) is None  # wacc == g terminal


def test_value_company_end_to_end():
    a = Assumptions()  # defaults
    f = Fundamentals(price=50, shares=10, fcf=100, net_income=80, equity=400,
                     total_debt=200, cash=50, eff_tax=0.21, cost_of_debt=0.05)
    r = value_company(f, a)
    assert abs(r["cost_of_equity"] - 0.09) < 1e-9
    assert abs(r["wacc"] - 0.075571) < 1e-4
    assert r["net_debt"] == 150
    assert r["market_cap"] == 500
    assert abs(r["ratios"]["eps"] - 8.0) < 1e-9
    assert abs(r["ratios"]["pe"] - 6.25) < 1e-9
    assert abs(r["ratios"]["pb"] - 1.25) < 1e-9
    assert abs(r["ratios"]["roe"] - 0.20) < 1e-9
    assert abs(r["ratios"]["de"] - 0.375) < 1e-9
    assert r["intrinsic_per_share"] is not None and r["intrinsic_per_share"] > 0
    assert r["verdict"] in ("subvalorizada (com margem)", "ligeiramente subvalorizada", "sobrevalorizada")


def test_opportunity_forte_for_cheap_quality():
    a = Assumptions()
    f = Fundamentals(price=30, shares=10, fcf=120, net_income=100, equity=500,
                     total_debt=100, cash=200, revenue=1000, ebitda=200,
                     fcf_history=[100, 110, 120], revenue_history=[800, 900, 1000])
    r = value_company(f, a)
    assert r["opportunity"] == "forte"
    assert r["score"] >= 65
    assert r["q_pass"] >= 3
    # múltiplos novos presentes
    assert r["ratios"]["ps"] is not None
    assert r["ratios"]["ev_ebitda"] is not None
    assert r["ratios"]["net_margin"] is not None


def test_conflict_downgrades_cheap_dcf_but_expensive_multiples():
    # DCF barato (crescimento alto) mas múltiplos caros -> não pode ser 'forte'.
    a = Assumptions()
    f = Fundamentals(price=100, shares=10, fcf=100, net_income=20, equity=100,
                     total_debt=50, cash=50, revenue=200, ebitda=30,
                     fcf_history=[50, 70, 100], revenue_history=[150, 175, 200])
    r = value_company(f, a)
    assert r["margin_of_safety"] is not None and r["margin_of_safety"] >= 0.30  # DCF diz barato
    assert r["c_pass"] <= 1                                                      # múltiplos caros
    assert r["opportunity"] != "forte"                                          # gate de coerência barra
    assert r["conflict"] is True


def test_opportunity_evitar_for_expensive_weak():
    a = Assumptions()
    f = Fundamentals(price=1000, shares=10, fcf=-10, net_income=-50, equity=100,
                     total_debt=400, cash=10, revenue=50, ebitda=-5,
                     fcf_history=[5, -2, -10], revenue_history=[60, 55, 50])
    r = value_company(f, a)
    assert r["opportunity"] == "evitar"
    assert r["q_pass"] <= 1


def test_negative_fcf_gives_no_intrinsic():
    a = Assumptions()
    f = Fundamentals(price=50, shares=10, fcf=-20, net_income=-10, equity=100,
                     total_debt=50, cash=20, revenue=100, ebitda=-5,
                     fcf_history=[-30, -20, -20])
    r = value_company(f, a)
    assert r["intrinsic_per_share"] is None       # sem valor negativo disparatado
    assert r["dcf_note"] is not None
    assert r["margin_of_safety"] is None
    assert r["opportunity"] != "forte"


def test_growth_from_history_is_capped():
    a = Assumptions()
    # histórico com CAGR ~30% deve ser limitado ao growth_cap (15%)
    f = Fundamentals(price=50, shares=10, fcf=100, net_income=80, equity=400,
                     total_debt=200, cash=50, fcf_history=[50, 65, 84.5, 109.8])
    r = value_company(f, a)
    assert abs(r["growth_used"] - a.growth_cap) < 1e-9
    assert r["growth_source"] == "histórico"
