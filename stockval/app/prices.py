"""Preço atual — Yahoo Finance (primário) com Stooq como reserva. Grátis, sem chave."""
from __future__ import annotations

import httpx

_YH = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1d"
_STOOQ = "https://stooq.com/q/l/?s={sym}.us&f=sd2t2ohlcv&h&e=csv"
_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"}


def _yahoo(ticker: str) -> float | None:
    for host in ("query1", "query2"):
        try:
            url = _YH.format(sym=ticker.upper()).replace("query1", host)
            with httpx.Client(timeout=15.0, follow_redirects=True, headers=_UA) as c:
                j = c.get(url).json()
            res = (j.get("chart") or {}).get("result")
            if res:
                meta = res[0].get("meta") or {}
                p = meta.get("regularMarketPrice") or meta.get("previousClose")
                if p:
                    return float(p)
        except Exception:
            continue
    return None


def _stooq(ticker: str) -> float | None:
    try:
        with httpx.Client(timeout=15.0, follow_redirects=True, headers=_UA) as c:
            txt = c.get(_STOOQ.format(sym=ticker.lower())).text
    except Exception:
        return None
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


def get_price(ticker: str) -> float | None:
    return _yahoo(ticker) or _stooq(ticker)
