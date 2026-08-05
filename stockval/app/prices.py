"""Preço atual via Stooq (grátis, sem chave). Fallback simples e fiável p/ EUA."""
from __future__ import annotations

import httpx

_URL = "https://stooq.com/q/l/?s={sym}.us&f=sd2t2ohlcv&h&e=csv"


def get_price(ticker: str) -> float | None:
    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as c:
            txt = c.get(_URL.format(sym=ticker.lower())).text
    except Exception:
        return None
    # CSV: Symbol,Date,Time,Open,High,Low,Close,Volume
    lines = [ln for ln in txt.strip().splitlines() if ln]
    if len(lines) < 2:
        return None
    header = [h.strip().lower() for h in lines[0].split(",")]
    row = lines[1].split(",")
    if "close" not in header:
        return None
    try:
        val = row[header.index("close")].strip()
        return float(val) if val not in ("N/D", "", "-") else None
    except (ValueError, IndexError):
        return None
