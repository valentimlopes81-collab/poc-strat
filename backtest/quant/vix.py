"""VIX (CBOE Volatility Index) -- camada de contexto adicional ao GEX.

GEX mede posicionamento estrutural dos dealers (gamma exposure); o VIX mede
medo/complacencia agregado do mercado de opcoes do SPX. Sao relacionados mas
nao iguais -- um regime de GEX negativo (amplificador) com VIX baixo e uma
leitura diferente de um com VIX ja elevado.

Dados: Yahoo Finance, ticker ^VIX, sem crumb (endpoint de chart publico).

Uso: python3 backtest/quant/vix.py
"""
import json
import subprocess
import sys

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def sh(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"cmd failed: {cmd} stderr={out.stderr[:300]}")
    return out.stdout


def fetch_vix(range_="1mo"):
    raw = sh(["curl", "-s", "-A", UA,
              f"https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range={range_}&interval=1d",
              "--max-time", "15"])
    d = json.loads(raw)
    r = d["chart"]["result"][0]
    closes = [c for c in r["indicators"]["quote"][0]["close"] if c is not None]
    return closes


def main():
    closes = fetch_vix()
    if not closes:
        print("Sem dados de VIX.", file=sys.stderr)
        sys.exit(1)

    cur = closes[-1]
    prev = closes[-2] if len(closes) >= 2 else None
    chg = (cur - prev) if prev else None
    chg_pct = (chg / prev * 100) if prev else None

    avg20 = sum(closes[-20:]) / len(closes[-20:])
    dist_pct = (cur / avg20 - 1) * 100

    print(f"VIX atual: {cur:.2f}" + (f"  ({chg:+.2f}, {chg_pct:+.1f}%)" if chg is not None else ""))
    print(f"Média 20d: {avg20:.2f}  (atual está {dist_pct:+.1f}% vs média)")

    if cur < 15:
        regime = "baixo/complacente"
    elif cur < 20:
        regime = "normal"
    elif cur < 30:
        regime = "elevado/cauteloso"
    else:
        regime = "stress/pânico"
    print(f"Leitura: {regime}")


if __name__ == "__main__":
    main()
