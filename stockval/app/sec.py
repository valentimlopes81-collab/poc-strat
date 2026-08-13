"""Cliente SEC EDGAR (dados oficiais, grátis, só EUA).

A SEC exige um User-Agent identificável; define SEC_UA se quiseres.
Os tags XBRL variam entre empresas — por isso tentamos vários candidatos e
devolvemos o que existir, marcando o que faltou (útil para depurar no CLI).
"""
from __future__ import annotations

import os

import httpx

UA = os.getenv("SEC_UA", "stockval app valentimlopes21@gmail.com")
_HEADERS = {"User-Agent": UA, "Accept-Encoding": "gzip, deflate"}
_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"

_cik_cache: dict[str, int] = {}


def _client() -> httpx.Client:
    return httpx.Client(headers=_HEADERS, timeout=30.0, follow_redirects=True)


def ticker_to_cik(ticker: str) -> int | None:
    global _cik_cache
    t = ticker.upper()
    if not _cik_cache:
        with _client() as c:
            r = c.get(_TICKERS_URL)
            r.raise_for_status()
            data = r.json()
        for row in data.values():
            _cik_cache[row["ticker"].upper()] = int(row["cik_str"])
    return _cik_cache.get(t)


def _annual_map(facts: dict, tags: list[str], unit: str, is_flow: bool) -> dict[int, float]:
    """Devolve {ano_fiscal: valor} usando reports anuais (10-K)."""
    out: dict[int, tuple[str, float]] = {}
    for ns in ("us-gaap", "dei"):
        for tag in tags:
            node = facts.get("facts", {}).get(ns, {}).get(tag)
            if not node:
                continue
            for u, arr in node.get("units", {}).items():
                if unit and u != unit:
                    continue
                for e in arr:
                    if not str(e.get("form", "")).startswith("10-K"):
                        continue
                    if is_flow and e.get("fp") not in ("FY", None):
                        continue
                    fy, end, val = e.get("fy"), e.get("end"), e.get("val")
                    if fy is None or val is None or end is None:
                        continue
                    if fy not in out or end > out[fy][0]:
                        out[fy] = (end, float(val))
            if out:
                return {fy: v for fy, (_, v) in out.items()}
    return {}


def _latest(m: dict[int, float]) -> float | None:
    return m[max(m)] if m else None


def fetch(ticker: str) -> dict:
    """Puxa e organiza os fundamentais de que o valuation precisa."""
    try:
        cik = ticker_to_cik(ticker)
    except Exception as e:
        return {"error": f"falha a contactar a SEC (tenta novamente daqui a pouco). [{e}]"}
    if cik is None:
        return {"error": f"ticker '{ticker}' não encontrado na SEC (só EUA)."}
    try:
        with _client() as c:
            r = c.get(_FACTS_URL.format(cik=cik))
            if r.status_code != 200:
                return {"error": f"SEC devolveu {r.status_code} para {ticker}."}
            facts = r.json()
    except Exception as e:
        return {"error": f"falha a obter dados da SEC para {ticker} (tenta novamente). [{e}]"}

    name = facts.get("entityName", ticker.upper())
    cfo_m = _annual_map(facts, ["NetCashProvidedByUsedInOperatingActivities",
                                "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"], "USD", True)
    capex_m = _annual_map(facts, ["PaymentsToAcquirePropertyPlantAndEquipment",
                                  "PaymentsToAcquireProductiveAssets"], "USD", True)
    ni_m = _annual_map(facts, ["NetIncomeLoss"], "USD", True)
    eq_m = _annual_map(facts, ["StockholdersEquity",
                               "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"], "USD", False)
    cash_m = _annual_map(facts, ["CashAndCashEquivalentsAtCarryingValue"], "USD", False)
    ltd_m = _annual_map(facts, ["LongTermDebtNoncurrent", "LongTermDebt"], "USD", False)
    curd_m = _annual_map(facts, ["LongTermDebtCurrent", "DebtCurrent"], "USD", False)
    tax_m = _annual_map(facts, ["IncomeTaxExpenseBenefit"], "USD", True)
    pretax_m = _annual_map(facts, ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
                                   "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"], "USD", True)
    int_m = _annual_map(facts, ["InterestExpense"], "USD", True)
    sh_m = _annual_map(facts, ["EntityCommonStockSharesOutstanding", "CommonStockSharesOutstanding",
                               "WeightedAverageNumberOfDilutedSharesOutstanding",
                               "WeightedAverageNumberOfSharesOutstandingBasic"], "shares", False)
    rev_m = _annual_map(facts, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
                                "SalesRevenueNet"], "USD", True)
    opinc_m = _annual_map(facts, ["OperatingIncomeLoss"], "USD", True)
    da_m = _annual_map(facts, ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization",
                               "DepreciationAmortizationAndAccretionNet"], "USD", True)

    # FCF por ano (anos comuns entre CFO e CAPEX) -> histórico p/ CAGR.
    common = sorted(set(cfo_m) & set(capex_m))
    fcf_history = [cfo_m[fy] - capex_m[fy] for fy in common]
    revenue_history = [rev_m[fy] for fy in sorted(rev_m)]

    opinc, da = _latest(opinc_m), _latest(da_m)
    ebitda = (opinc + (da or 0.0)) if opinc is not None else None

    cfo, capex = _latest(cfo_m), _latest(capex_m)
    fcf = (cfo - capex) if (cfo is not None and capex is not None) else None
    ltd, curd = _latest(ltd_m) or 0.0, _latest(curd_m) or 0.0
    total_debt = ltd + curd
    tax, pretax = _latest(tax_m), _latest(pretax_m)
    eff_tax = (tax / pretax) if (tax is not None and pretax not in (None, 0)) else None
    if eff_tax is not None:
        eff_tax = max(0.0, min(0.5, eff_tax))  # sanidade
    interest = _latest(int_m)
    cost_of_debt = (interest / total_debt) if (interest is not None and total_debt) else None

    missing = [k for k, v in {
        "FCF": fcf, "net_income": _latest(ni_m), "equity": _latest(eq_m),
        "shares": _latest(sh_m),
    }.items() if v in (None, 0)]

    return {
        "name": name, "cik": cik,
        "fcf": fcf, "cfo": cfo, "capex": capex,
        "net_income": _latest(ni_m), "equity": _latest(eq_m),
        "total_debt": total_debt, "cash": _latest(cash_m) or 0.0,
        "shares": _latest(sh_m),
        "eff_tax": eff_tax, "cost_of_debt": cost_of_debt,
        "fcf_history": fcf_history,
        "revenue": _latest(rev_m) or 0.0, "ebitda": ebitda,
        "revenue_history": revenue_history,
        "missing": missing,
    }
