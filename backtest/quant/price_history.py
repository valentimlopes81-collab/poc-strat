"""Exporta historico de precos (candles) para o terminal: QQQ (proxy NQ) via
Cboe/OpenBB, BTC via Kraken (publico, sem chave). Usado para o grafico de
velas com os niveis de GEX sobrepostos (Call Wall / Put Wall / Zero-gamma) --
o equivalente as "confluencias" que se veem num grafico TradingView.

Uso: python3 backtest/quant/price_history.py
Escreve terminal/public/data/price_nq.json e price_btc.json.
"""
import json
import subprocess

import pandas as pd
from openbb import obb

OUT_DIR = "terminal/public/data"


def export_qqq(days_back=2):
    df = obb.equity.price.historical("QQQ", interval="1m", provider="cboe").to_dataframe()
    df = df[["open", "high", "low", "close", "volume", "calls_volume", "puts_volume"]].copy()
    df.index = pd.to_datetime(df.index)
    cutoff = df.index.max() - pd.Timedelta(days=days_back)
    df = df[df.index >= cutoff]
    # resample para 5m (menos ruido, mais legivel, estilo grafico intradiario)
    agg = df.resample("5min").agg({
        "open": "first", "high": "max", "low": "min", "close": "last",
        "volume": "sum", "calls_volume": "sum", "puts_volume": "sum",
    }).dropna()
    rows = [
        {"time": int(ts.timestamp()), "open": round(r.open, 2), "high": round(r.high, 2),
         "low": round(r.low, 2), "close": round(r.close, 2), "volume": int(r.volume),
         "calls_volume": int(r.calls_volume), "puts_volume": int(r.puts_volume)}
        for ts, r in agg.iterrows()
    ]
    with open(f"{OUT_DIR}/price_nq.json", "w") as f:
        json.dump(rows, f)
    print(f"QQQ: {len(rows)} candles de 5m (ultimos {days_back}d), com volume + calls/puts volume")


def export_qqq_daily(days_back=120):
    df = obb.equity.price.historical("QQQ", interval="1d", provider="cboe").to_dataframe()
    df = df[["open", "high", "low", "close", "volume"]].copy()
    df.index = pd.to_datetime(df.index)
    df = df.tail(days_back)
    rows = [
        {"time": int(ts.timestamp()), "open": round(r.open, 2), "high": round(r.high, 2),
         "low": round(r.low, 2), "close": round(r.close, 2), "volume": int(r.volume)}
        for ts, r in df.iterrows()
    ]
    with open(f"{OUT_DIR}/price_nq_daily.json", "w") as f:
        json.dump(rows, f)
    print(f"QQQ diario: {len(rows)} candles (ultimos {days_back}d)")


def export_btc(bars=720, interval_min=60):
    raw = subprocess.run(
        ["curl", "-sS", "--max-time", "20",
         f"https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval={interval_min}"],
        capture_output=True, text=True, timeout=30,
    ).stdout
    d = json.loads(raw)
    key = [k for k in d["result"].keys() if k != "last"][0]
    raw_rows = d["result"][key][-bars:]
    rows = [
        {"time": int(r[0]), "open": round(float(r[1]), 1), "high": round(float(r[2]), 1),
         "low": round(float(r[3]), 1), "close": round(float(r[4]), 1), "volume": round(float(r[6]), 2)}
        for r in raw_rows
    ]
    with open(f"{OUT_DIR}/price_btc.json", "w") as f:
        json.dump(rows, f)
    print(f"BTC: {len(rows)} candles de {interval_min}m")


def export_vix(days_back=60):
    raw = subprocess.run(
        ["curl", "-s", "-A", "Mozilla/5.0", "--max-time", "15",
         f"https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=3mo&interval=1d"],
        capture_output=True, text=True, timeout=20,
    ).stdout
    d = json.loads(raw)
    r = d["chart"]["result"][0]
    ts = r["timestamp"]
    closes = r["indicators"]["quote"][0]["close"]
    rows = [{"time": t, "value": round(c, 2)} for t, c in zip(ts, closes) if c is not None][-days_back:]
    with open(f"{OUT_DIR}/vix_history.json", "w") as f:
        json.dump(rows, f)
    print(f"VIX: {len(rows)} dias")


if __name__ == "__main__":
    export_qqq()
    export_qqq_daily()
    export_btc()
    export_vix()
