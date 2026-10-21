"""Cliente SEC EDGAR (dados oficiais, grátis, só EUA).

A SEC exige um User-Agent identificável; define SEC_UA se quiseres.
Os tags XBRL variam entre empresas — por isso tentamos vários candidatos e
devolvemos o que existir, marcando o que faltou (útil para depurar no CLI).
"""
from __future__ import annotations

import datetime
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
    """Devolve {ano_fiscal: valor} usando reports anuais (10-K).

    Prefere valores "framed" (não-dimensionais) — evita apanhar linhas por
    classe de ações / segmentos, que davam nº de ações e rácios errados.
    """
    # NOTA (bug corrigido): muitas empresas migraram de tag a meio do historico
    # (ex.: "Revenues" -> "RevenueFromContractWithCustomerExcludingAssessedTax"
    # apos adotarem a norma ASC 606, ~2018-2019). Um "return" assim que o
    # primeiro tag da lista desse QUALQUER resultado deixava office presa a
    # dados antigos e congelados (ex.: AVGO ficava no ultimo ano reportado sob
    # "Revenues", 2018, ignorando anos muito mais recentes só porque estavam
    # sob o tag novo). Por isso agora acumulam-se TODOS os tags/namespaces no
    # mesmo dict por ano fiscal, usando o mesmo criterio de desempate (framed,
    # depois data mais recente) -- o tag certo ganha por ano, nao por ordem.
    out: dict[int, tuple[str, float, bool]] = {}  # fy -> (end, val, framed)
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
                    # BUG REAL (encontrado via NFLX): fp="FY" não garante que o período
                    # medido tem ~12 meses -- um 10-K também embute dados trimestrais
                    # (ex.: nota de "selected quarterly data") sob fp="FY" só porque
                    # pertencem ao contexto desse ano fiscal, não porque o próprio
                    # start/end cubra o ano todo. Isto fazia o GrossProfit da Netflix
                    # ficar preso a um valor de Q4 2020 (3 meses) tratado como se fosse
                    # anual, por não haver tag "GrossProfit" mais recente -- margem
                    # bruta saía ~5% em vez de ~40%. Exigir duração >= ~330 dias para
                    # flows anuais evita isto sem afetar as frequências corretas.
                    if is_flow:
                        start = e.get("start")
                        if start:
                            try:
                                days = (datetime.date.fromisoformat(end) - datetime.date.fromisoformat(start)).days
                            except ValueError:
                                days = None
                            if days is not None and days < 330:
                                continue
                    framed = "frame" in e
                    cur = out.get(fy)
                    # A data (end) manda sempre primeiro -- "fy" é o ano fiscal DO FILING,
                    # não necessariamente do período: um 10-K traz o ano corrente + 2 anos
                    # comparativos, todos sob o MESMO "fy", distinguidos só por start/end.
                    # BUG REAL (encontrado via NVDA): a SEC às vezes marca com 'frame' um
                    # período comparativo ANTIGO (ex.: frame=CY2021 num start/end que é na
                    # verdade o ano fiscal 2022 da NVDA, fiscal year termina em janeiro) --
                    # com "framed ganha sempre" isso ficava preso ao valor antigo para
                    # sempre, ignorando o valor correto e mais recente do mesmo filing
                    # (FCF da NVDA saía ~8B/3.8B em vez de ~27B/61B em 2 anos). 'framed' só
                    # deve desempatar quando os PERÍODOS são o mesmo (ex.: nº de ações por
                    # classe vs. total consolidado), nunca substituir um período mais recente.
                    if cur is None or end > cur[0] or (end == cur[0] and framed and not cur[2]):
                        out[fy] = (end, float(val), framed)
    return {fy: v for fy, (_, v, _) in out.items()}


def _latest(m: dict[int, float]) -> float | None:
    return m[max(m)] if m else None


def _trailing_contiguous_years(fys) -> list[int]:
    """Dado um conjunto/dict de anos fiscais disponíveis, devolve só a sequência
    CONTÍNUA mais recente (sem buracos), do mais antigo ao mais recente. Ver
    nota em fetch() -- necessário para qualquer histórico usado em cagr()."""
    if not fys:
        return []
    ys = sorted(set(fys))
    run = [ys[-1]]
    for y in reversed(ys[:-1]):
        if run[0] - y == 1:
            run.insert(0, y)
        else:
            break
    return run


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
    # Algumas empresas (ex.: LLY) nunca reportam a tag "normal" no 10-K anual --
    # só trimestral, sem agregado anual -- e o capex real fica só sob a tag
    # "Other" (decomposição por categoria em vez de um total único).
    capex_m = _annual_map(facts, ["PaymentsToAcquirePropertyPlantAndEquipment",
                                  "PaymentsToAcquireProductiveAssets",
                                  "PaymentsToAcquireOtherPropertyPlantAndEquipment"], "USD", True)
    ni_m = _annual_map(facts, ["NetIncomeLoss"], "USD", True)
    eq_m = _annual_map(facts, ["StockholdersEquity",
                               "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"], "USD", False)
    cash_m = _annual_map(facts, ["CashAndCashEquivalentsAtCarryingValue"], "USD", False)
    ltd_m = _annual_map(facts, ["LongTermDebtNoncurrent", "LongTermDebt"], "USD", False)
    curd_m = _annual_map(facts, ["LongTermDebtCurrent", "DebtCurrent"], "USD", False)
    # Algumas empresas (ex.: ORCL) nao separam divida corrente/nao-corrente em tags
    # distintas -- reportam um unico valor combinado. Sem isto, ltd_m fica vazio e
    # total_debt = so a parte corrente (curd_m), subestimando a divida real em
    # dezenas de mil milhoes (caso real: ORCL saia ~$7B em vez de ~$125B).
    combined_debt_m = _annual_map(facts, ["DebtLongtermAndShorttermCombinedAmount"], "USD", False)
    tax_m = _annual_map(facts, ["IncomeTaxExpenseBenefit"], "USD", True)
    pretax_m = _annual_map(facts, ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
                                   "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"], "USD", True)
    int_m = _annual_map(facts, ["InterestExpense"], "USD", True)
    # Nº de ações: preferir a média ponderada diluída (escalar total, consistente
    # com o EPS) — evita as contagens por classe que davam valores errados.
    sh_m = _annual_map(facts, ["WeightedAverageNumberOfDilutedSharesOutstanding",
                               "WeightedAverageNumberOfSharesOutstandingBasic",
                               "EntityCommonStockSharesOutstanding"], "shares", False)
    rev_m = _annual_map(facts, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
                                "SalesRevenueNet"], "USD", True)
    # Bancos/corretoras (ex.: HOOD) tipicamente não reportam "OperatingIncomeLoss"
    # -- a receita de juros é core business, não "não-operacional", por isso não
    # há uma linha separada de resultado operacional. Fallback: pre-tax income
    # (já usado para a taxa efetiva) é a melhor aproximação disponível p/ EBITDA.
    opinc_m = _annual_map(facts, ["OperatingIncomeLoss"], "USD", True) or pretax_m
    da_m = _annual_map(facts, ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization",
                               "DepreciationAmortizationAndAccretionNet"], "USD", True)
    gp_m = _annual_map(facts, ["GrossProfit"], "USD", True)
    # BUG REAL (encontrado via NFLX): "GrossProfit" pode existir no histórico sem
    # estar vazio -- mas só nos anos mais antigos (a empresa parou de a reportar
    # como tag própria a dada altura, ex.: NFLX só a tag até 2011). "if not gp_m"
    # não apanha isto, porque o dict não está vazio, só desatualizado -- _latest()
    # ficava preso a um ano de há 15 anos (margem bruta saía ~3% em vez de ~40%).
    # Exigir que o ano mais recente de gp_m acompanhe o ano mais recente de rev_m
    # (tolerância de 1 ano) evita isto sem quebrar empresas que nunca tiveram a tag.
    if not gp_m or (rev_m and max(gp_m) < max(rev_m) - 1):
        # Algumas empresas (ex.: LLY) não reportam "GrossProfit" como tag própria,
        # só o custo de vendas -- a margem bruta dá para derivar de Receita - COGS.
        cogs_m = _annual_map(facts, ["CostOfGoodsAndServicesSold", "CostOfRevenue",
                                     "CostOfServices", "CostOfGoodsSold"], "USD", True)
        gp_m = {fy: rev_m[fy] - cogs_m[fy] for fy in sorted(set(rev_m) & set(cogs_m))}
    sbc_m = _annual_map(facts, ["ShareBasedCompensation", "AllocatedShareBasedCompensationExpense",
                                "ShareBasedCompensationArrangementByShareBasedPaymentAwardCompensationCost1"], "USD", True)

    # FCF por ano (anos comuns entre CFO e CAPEX) -> histórico p/ CAGR.
    # IMPORTANTE: cagr() assume que cada elemento da lista é 1 ano consecutivo
    # (usa len(serie)-1 como nº de períodos). Se uma empresa mudou de tag XBRL a
    # meio do histórico (ex.: NVDA só tem 1 ponto residual de 2011 sob a tag
    # antiga de capex, e o resto, contínuo, só a partir de 2024 sob a tag nova),
    # juntar os dois sem filtrar cria um "buraco" de anos tratado como 1 único
    # ano de crescimento composto -> CAGR absurdamente inflacionado. Por isso
    # usa-se sempre só a sequência CONTÍNUA mais recente (sem buracos).
    common = _trailing_contiguous_years(set(cfo_m) & set(capex_m))
    fcf_history = [cfo_m[fy] - capex_m[fy] for fy in common]
    revenue_history = [rev_m[fy] for fy in _trailing_contiguous_years(rev_m)]
    opinc_history = [opinc_m[fy] for fy in _trailing_contiguous_years(opinc_m)]
    # EPS diluído reportado por ano (para EPS YoY/CAGR).
    epsd_m_full = (_annual_map(facts, ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted",
                                       "IncomeLossFromContinuingOperationsPerDilutedShare"], "USD/shares", False)
                   or _annual_map(facts, ["EarningsPerShareBasic"], "USD/shares", False))
    eps_history = [epsd_m_full[fy] for fy in _trailing_contiguous_years(epsd_m_full)]
    # Nº de ações por ano derivado de lucro/EPS (imune a multi-classe) -> diluição.
    sh_common = _trailing_contiguous_years(set(ni_m) & set(epsd_m_full))
    shares_history = [ni_m[fy] / epsd_m_full[fy] for fy in sh_common
                      if epsd_m_full[fy] not in (None, 0) and ni_m[fy] / epsd_m_full[fy] > 0]
    # Margem operacional por ano (anos comuns opinc & receita) -> tendência de margem.
    om_common = _trailing_contiguous_years(set(opinc_m) & set(rev_m))
    op_margin_history = [opinc_m[fy] / rev_m[fy] for fy in om_common if rev_m[fy]]

    opinc, da = _latest(opinc_m), _latest(da_m)
    ebitda = (opinc + (da or 0.0)) if opinc is not None else None

    cfo, capex = _latest(cfo_m), _latest(capex_m)
    fcf = (cfo - capex) if (cfo is not None and capex is not None) else None
    ltd, curd = _latest(ltd_m) or 0.0, _latest(curd_m) or 0.0
    combined_debt = _latest(combined_debt_m)
    # Se nao ha divida nao-corrente separada mas ha tag combinada, usa-a (mais
    # completa que so a parte corrente). Caso contrario soma as duas partes.
    total_debt = combined_debt if (ltd == 0.0 and combined_debt) else ltd + curd
    tax, pretax = _latest(tax_m), _latest(pretax_m)
    eff_tax = (tax / pretax) if (tax is not None and pretax not in (None, 0)) else None
    if eff_tax is not None:
        eff_tax = max(0.0, min(0.5, eff_tax))  # sanidade
    interest = _latest(int_m)
    cost_of_debt = (interest / total_debt) if (interest is not None and total_debt) else None

    # EPS diluído reportado pela SEC (escalar limpo). Serve para o P/E direto e,
    # sobretudo, para DERIVAR o nº de ações (= lucro / EPS) — imune a multi-classe.
    epsd_m = (
        _annual_map(facts, ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted",
                            "IncomeLossFromContinuingOperationsPerDilutedShare"], "USD/shares", False)
        or _annual_map(facts, ["EarningsPerShareBasic"], "USD/shares", False)
        or _annual_map(facts, ["EarningsPerShareDiluted", "EarningsPerShareBasic",
                               "EarningsPerShareBasicAndDiluted"], None, False))
    eps = _latest(epsd_m)
    net_income = _latest(ni_m)
    shares = _latest(sh_m)
    if eps and net_income is not None and eps != 0:
        implied = net_income / eps
        if implied > 0:
            shares = implied  # base diluída correta, sem o problema das classes

    missing = [k for k, v in {
        "FCF": fcf, "net_income": net_income, "equity": _latest(eq_m), "shares": shares,
    }.items() if v in (None, 0)]

    return {
        "name": name, "cik": cik,
        "fcf": fcf, "cfo": cfo, "capex": capex,
        "net_income": net_income, "equity": _latest(eq_m),
        "total_debt": total_debt, "cash": _latest(cash_m) or 0.0,
        "shares": shares, "eps": eps,
        "eff_tax": eff_tax, "cost_of_debt": cost_of_debt,
        "fcf_history": fcf_history,
        "revenue": _latest(rev_m) or 0.0, "ebitda": ebitda,
        "revenue_history": revenue_history,
        "operating_income": opinc, "interest_expense": interest,
        "gross_profit": _latest(gp_m), "sbc": _latest(sbc_m),
        "operating_income_history": opinc_history,
        "op_margin_history": op_margin_history,
        "shares_history": shares_history, "eps_history": eps_history,
        "missing": missing,
    }
