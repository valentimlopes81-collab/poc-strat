"""Motor de valuation — funções puras (sem rede), testáveis.

Modelo: DCF a 2 fases (FCF descontado + valor terminal de Gordon), WACC via
CAPM. Segue as fórmulas do Notion, com um crescimento terminal separado (mais
correto que reutilizar o crescimento da 1ª fase, que faria o valor explodir).
"""
from __future__ import annotations

from dataclasses import dataclass

from .config import Assumptions


@dataclass
class Fundamentals:
    """Números vindos da SEC/preço (o que o motor precisa)."""
    price: float
    shares: float
    fcf: float                 # FCF mais recente = CFO - CAPEX
    net_income: float
    equity: float              # património (stockholders' equity)
    total_debt: float
    cash: float
    eff_tax: float | None = None      # taxa de imposto efetiva (opcional)
    cost_of_debt: float | None = None  # juros / dívida (opcional)
    fcf_history: list[float] | None = None  # FCF por ano (mais antigo -> recente)


def cost_of_equity(rf: float, beta: float, erp: float) -> float:
    return rf + beta * erp


def wacc(equity_mktcap: float, debt: float, re: float, rd: float, tax: float) -> float:
    v = equity_mktcap + debt
    if v <= 0:
        return re
    we, wd = equity_mktcap / v, debt / v
    return we * re + wd * rd * (1.0 - tax)


def two_stage_dcf(fcf0: float, growth: float, years: int, terminal_growth: float, disc: float) -> float | None:
    """Valor da empresa (enterprise value) pelo DCF a 2 fases.
    Devolve None se os pressupostos forem incoerentes (WACC <= g terminal)."""
    if disc <= terminal_growth or years <= 0:
        return None
    pv_stage1 = 0.0
    fcf_t = fcf0
    for t in range(1, years + 1):
        fcf_t = fcf0 * (1.0 + growth) ** t
        pv_stage1 += fcf_t / (1.0 + disc) ** t
    fcf_n = fcf0 * (1.0 + growth) ** years
    tv = fcf_n * (1.0 + terminal_growth) / (disc - terminal_growth)
    pv_tv = tv / (1.0 + disc) ** years
    return pv_stage1 + pv_tv


def cagr(series: list[float]) -> float | None:
    """CAGR de uma série (mais antigo -> recente). None se não der (sinais/zeros)."""
    if not series or len(series) < 2:
        return None
    first, last = series[0], series[-1]
    if first <= 0 or last <= 0:
        return None
    n = len(series) - 1
    return (last / first) ** (1.0 / n) - 1.0


def _safe_div(a: float, b: float) -> float | None:
    return (a / b) if b else None


def value_company(f: Fundamentals, a: Assumptions) -> dict:
    """Aplica o DCF + rácios e devolve tudo o que o site mostra."""
    net_debt = f.total_debt - f.cash
    mktcap = f.price * f.shares
    tax = f.eff_tax if f.eff_tax is not None else a.tax
    rd = f.cost_of_debt if f.cost_of_debt is not None else a.cost_of_debt

    # Crescimento da 1ª fase: histórico do FCF (limitado) se existir, senão default.
    hist_cagr = cagr(f.fcf_history) if f.fcf_history else None
    growth = a.growth
    if hist_cagr is not None:
        growth = max(a.growth_floor, min(a.growth_cap, hist_cagr))

    re = cost_of_equity(a.risk_free, a.beta, a.erp)
    w = wacc(mktcap, f.total_debt, re, rd, tax)

    ev = two_stage_dcf(f.fcf, growth, a.years, a.terminal_growth, w)
    intrinsic_ps = None
    equity_value = None
    if ev is not None and f.shares > 0:
        equity_value = ev - net_debt
        intrinsic_ps = equity_value / f.shares

    upside = None
    mos = None  # margem de segurança implícita (quão abaixo está o preço)
    verdict = "indeterminado"
    if intrinsic_ps and intrinsic_ps > 0 and f.price > 0:
        upside = (intrinsic_ps - f.price) / f.price
        mos = (intrinsic_ps - f.price) / intrinsic_ps
        if mos >= a.margin_of_safety:
            verdict = "subvalorizada (com margem)"
        elif intrinsic_ps > f.price:
            verdict = "ligeiramente subvalorizada"
        else:
            verdict = "sobrevalorizada"

    eps = _safe_div(f.net_income, f.shares)
    bvps = _safe_div(f.equity, f.shares)
    pe = _safe_div(f.price, eps) if eps else None
    pb = _safe_div(f.price, bvps) if bvps else None
    peg = _safe_div(pe, growth * 100.0) if (pe and growth > 0) else None
    roe = _safe_div(f.net_income, f.equity)
    de = _safe_div(net_debt, f.equity)

    return {
        "intrinsic_per_share": intrinsic_ps,
        "price": f.price,
        "upside": upside,                 # vs preço (>0 = potencial de subida)
        "margin_of_safety": mos,          # (intrínseco - preço)/intrínseco
        "verdict": verdict,
        "enterprise_value": ev,
        "equity_value": equity_value,
        "wacc": w,
        "cost_of_equity": re,
        "growth_used": growth,
        "growth_source": "histórico" if hist_cagr is not None else "default",
        "net_debt": net_debt,
        "market_cap": mktcap,
        "ratios": {"pe": pe, "pb": pb, "peg": peg, "roe": roe, "de": de, "eps": eps, "bvps": bvps},
    }
