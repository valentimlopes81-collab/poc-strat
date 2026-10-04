"""Mapa ticker -> setor, para comparar múltiplos entre pares parecidos.

Agrupado por modelo de negócio (não GICS estrito) para as comparações fazerem
sentido: pagamentos != bancos, semis != software, etc.
"""
from __future__ import annotations

_GROUPS = {
    "Semicondutores": ["NVDA", "AMD", "INTC", "TSM", "MU", "QCOM"],
    "Software & Tech": ["AAPL", "MSFT", "ORCL", "IBM", "CSCO", "PLTR"],
    "Internet & Media": ["GOOGL", "META", "NFLX", "DIS"],
    "Consumo Discricionário": ["AMZN", "TSLA", "HD", "MCD", "SBUX", "NKE", "CROX", "TGT", "XPEV"],
    "Staples": ["WMT", "KO", "PEP", "PG", "MDLZ", "MO"],
    "Saúde": ["UNH", "JNJ", "MRK", "ABBV", "BMY", "GILD", "PFE", "MDT", "CVS", "HIMS"],
    "Industriais": ["CAT", "DE", "UPS", "RTX", "LMT", "MMM"],
    "Energia": ["XOM", "CVX", "COP", "OXY"],
    "Fintech & Pagamentos": ["V", "PYPL", "SOFI"],
    "Financeiras": ["JPM", "MSTR"],
    "Especulativas": ["RGTI", "SPCX"],
}

SECTOR: dict[str, str] = {t: sec for sec, tickers in _GROUPS.items() for t in tickers}


def sector_of(ticker: str) -> str:
    return SECTOR.get(ticker.upper(), "Outro")


# Financeiras de "balanço pesado" — bancos, emissoras de cartão/crédito,
# seguradoras subscritoras. Nestas, a "dívida" na SEC é o próprio negócio
# (depósitos, apólices, financiamento aos clientes), não alavancagem no
# sentido industrial — por isso rácios como EV/EBITDA, Net debt/EBITDA,
# interest coverage e ROIC vs WACC (pensados para empresas não-financeiras)
# ficam sempre distorcidos (ex.: AXP mostrava Net debt/EBITDA de ~10x e
# interest coverage de 0.4x só por isto, não por ser arriscada). Excluídas
# do score para estas; o que continua a fazer sentido (ROE, margem líquida,
# P/E, P/B, PEG) mantém-se.
# Não inclui financeiras "asset-light" (bolsas, agências de rating, gestoras
# de ativos, corretoras de seguros, redes de pagamento puras) — essas não
# têm livro de crédito/apólices no balanço e os rácios normais funcionam bem:
# MCO, SPGI, MSCI, NDAQ, BLK, AJG, AON, MORN, V, MA, IBKR, HOOD, COIN.
BALANCE_SHEET_HEAVY = {"JPM", "GS", "MS", "BAC", "C", "WFC", "AXP", "SOFI", "CB"}


def is_balance_sheet_heavy(ticker: str) -> bool:
    return ticker.upper() in BALANCE_SHEET_HEAVY
