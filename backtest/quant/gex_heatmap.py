"""GEX por (expiracao, strike) para NQ e BTC -- grid para heatmap estilo
"options flow" (DeepCharts/SpotGamma). Reusa gex_common.py (mesma
metodologia Black-Scholes) e as mesmas fontes de dados que nq_gex.py /
btc_gex.py (Cboe via OpenBB / Deribit), só sem colapsar para um numero so.

Uso: python3 backtest/quant/gex_heatmap.py
Escreve terminal/public/data/gex_heatmap_nq.json e gex_heatmap_btc.json.
"""
import datetime
import json
from collections import defaultdict

from gex_common import bs_gamma
from openbb_data import fetch_qqq_chain_df
import btc_gex

OUT_DIR = "terminal/public/data"
MULT_NQ = 100.0


def export_nq(max_expiries=6, pct_band=0.07):
    df, spot = fetch_qqq_chain_df()
    now = datetime.datetime.utcnow()
    today = now.date()
    exps = sorted(e for e in df["expiration"].unique() if 0 <= (e - today).days <= 30)[:max_expiries]
    lo, hi = spot * (1 - pct_band), spot * (1 + pct_band)

    cells = defaultdict(float)
    for r in df.itertuples():
        if r.expiration not in exps or r.strike < lo or r.strike > hi:
            continue
        iv, oi = r.implied_volatility, r.open_interest
        if not iv or iv <= 0.01 or not oi or oi <= 0:
            continue
        expiry_dt = datetime.datetime.combine(r.expiration, datetime.time(21, 0))
        T = (expiry_dt - now).total_seconds() / (365.25 * 24 * 3600)
        if T <= 0:
            continue
        g = bs_gamma(spot, r.strike, T, iv)
        sign = 1.0 if r.option_type == "call" else -1.0
        cells[(r.expiration.isoformat(), float(r.strike))] += sign * g * oi * spot * spot * 0.01 * MULT_NQ

    rows = [{"expiry": exp, "strike": strike, "gex": val} for (exp, strike), val in cells.items()]
    rows.sort(key=lambda r: (r["expiry"], r["strike"]))
    with open(f"{OUT_DIR}/gex_heatmap_nq.json", "w") as f:
        json.dump({"spot": spot, "expiries": [e.isoformat() for e in exps], "rows": rows}, f)
    print(f"NQ heatmap: {len(rows)} celulas, {len(exps)} expiracoes, spot={spot}")


def export_btc(max_expiries=6, pct_band=0.15):
    instruments = btc_gex.fetch()
    rows_raw, spot = btc_gex.build_rows(instruments, max_days=45)
    exps = sorted(set(r["expiry"] for r in rows_raw))[:max_expiries]
    lo, hi = spot * (1 - pct_band), spot * (1 + pct_band)

    cells = defaultdict(float)
    for r in rows_raw:
        if r["expiry"] not in exps or r["strike"] < lo or r["strike"] > hi:
            continue
        g = bs_gamma(spot, r["strike"], r["T"], r["iv"])
        sign = 1.0 if r["cp"] == "C" else -1.0
        cells[(r["expiry"], float(r["strike"]))] += sign * g * r["oi"] * spot * spot * 0.01

    rows = [{"expiry": exp, "strike": strike, "gex": val} for (exp, strike), val in cells.items()]
    rows.sort(key=lambda r: (r["expiry"], r["strike"]))
    with open(f"{OUT_DIR}/gex_heatmap_btc.json", "w") as f:
        json.dump({"spot": spot, "expiries": exps, "rows": rows}, f)
    print(f"BTC heatmap: {len(rows)} celulas, {len(exps)} expiracoes, spot={spot}")


if __name__ == "__main__":
    export_nq()
    export_btc()
