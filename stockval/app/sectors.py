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
