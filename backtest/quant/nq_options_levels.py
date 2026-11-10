"""Extrai niveis de liquidez/posicionamento a partir das opcoes QQQ (proxy de NQ):
concentracao de open interest por strike (paredes), max pain da proxima
expiracao. Estrike de QQQ e traduzido para "equivalente NQ" usando o racio de
preco atual entre os dois (aproximado, nao e o mesmo instrumento).

Chain via Cboe (OpenBB) desde 10/11 — substitui o fetch por crumb a Yahoo, que
sofria rate-limit quase todos os dias (ver quant_bias.md 10/11).

Uso: python3 backtest/quant/nq_options_levels.py [nq_price_atual]
Se nq_price_atual nao for dado, tenta obter o do proprio NQ=F (chart endpoint).
"""
import subprocess
import sys
import json
from collections import defaultdict

from openbb_data import fetch_qqq_chain_df

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def sh(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"cmd failed: {cmd} stderr={out.stderr[:300]}")
    return out.stdout


def fetch_nq_price():
    """Busca o ultimo preco do futuro NQ=F via Yahoo (sem crumb, endpoint de chart)."""
    try:
        raw = sh(["curl", "-s", "-A", UA,
                   "https://query1.finance.yahoo.com/v8/finance/chart/NQ=F?range=1d&interval=1m",
                   "--max-time", "15"])
        d = json.loads(raw)
        r = d["chart"]["result"][0]
        closes = [c for c in r["indicators"]["quote"][0]["close"] if c is not None]
        return closes[-1] if closes else None
    except Exception:
        return None


def max_pain(calls, puts):
    strikes = sorted(set(c["strike"] for c in calls) | set(p["strike"] for p in puts))
    call_oi = {c["strike"]: c.get("openInterest") or 0 for c in calls}
    put_oi = {p["strike"]: p.get("openInterest") or 0 for p in puts}
    best_strike, best_pain = None, None
    for settle in strikes:
        pain = sum((settle - k) * oi for k, oi in call_oi.items() if settle > k)
        pain += sum((k - settle) * oi for k, oi in put_oi.items() if settle < k)
        if best_pain is None or pain < best_pain:
            best_pain, best_strike = pain, settle
    return best_strike


def main():
    nq_price_arg = float(sys.argv[1]) if len(sys.argv) > 1 else None
    df, qqq_price = fetch_qqq_chain_df()
    exp_dates = sorted(e for e in df["expiration"].unique())[:6]  # proximas ~6 expiracoes

    auto_fetched = False
    if not nq_price_arg:
        nq_price_arg = fetch_nq_price()
        auto_fetched = nq_price_arg is not None
    ratio = (nq_price_arg / qqq_price) if nq_price_arg else None
    print(f"QQQ price: {qqq_price}")
    if ratio:
        tag = " (auto, NQ=F)" if auto_fetched else ""
        print(f"NQ price: {nq_price_arg}{tag} -> racio NQ/QQQ: {ratio:.4f}")
    else:
        print("Sem preco NQ (nem argumento nem auto-fetch) - estrikes so em termos QQQ.")

    near = df[df["expiration"] == exp_dates[0]]
    near_calls = [{"strike": s, "openInterest": oi} for s, oi in
                  zip(near.loc[near["option_type"] == "call", "strike"],
                      near.loc[near["option_type"] == "call", "open_interest"])]
    near_puts = [{"strike": s, "openInterest": oi} for s, oi in
                 zip(near.loc[near["option_type"] == "put", "strike"],
                     near.loc[near["option_type"] == "put", "open_interest"])]

    band_df = df[df["expiration"].isin(exp_dates)]
    agg_oi = defaultdict(float)
    for strike, oi in zip(band_df["strike"], band_df["open_interest"]):
        agg_oi[strike] += oi or 0

    mp = max_pain(near_calls, near_puts)
    calls_oi_total = sum(c["openInterest"] or 0 for c in near_calls)
    puts_oi_total = sum(p["openInterest"] or 0 for p in near_puts)
    pc_ratio = puts_oi_total / calls_oi_total if calls_oi_total else None

    print(f"\nMax pain (expiracao mais proxima): {mp} QQQ" + (f"  (~{mp*ratio:.0f} NQ)" if ratio else ""))
    print(f"Put/Call OI ratio (expiracao mais proxima): {pc_ratio:.2f}" if pc_ratio else "n/a")

    print(f"\nTop strikes por OI agregado (~proximas 6 expiracoes, +/-10% do preco):")
    band = [(k, v) for k, v in agg_oi.items() if qqq_price * 0.9 <= k <= qqq_price * 1.1]
    for strike, oi in sorted(band, key=lambda kv: -kv[1])[:8]:
        dist_pct = (strike / qqq_price - 1) * 100
        nq_equiv = f"  (~{strike*ratio:.0f} NQ)" if ratio else ""
        print(f"  {strike:>8.1f} QQQ{nq_equiv}  OI={oi:>7.0f}  ({dist_pct:+.1f}% do preco)")


if __name__ == "__main__":
    main()
