"""Extrai niveis de liquidez/posicionamento a partir das opcoes BTC do Deribit:
concentracao de open interest por strike (paredes), max pain da proxima
expiracao, e put/call ratio. Dados publicos, sem autenticacao.

Uso: python3 backtest/quant/btc_options_levels.py
"""
import json
import re
import subprocess
from collections import defaultdict

URL = "https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option"


def fetch():
    out = subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", "--max-time", "20", URL],
                          capture_output=True, text=True, timeout=30)
    if out.returncode != 0 or not out.stdout.strip():
        raise RuntimeError(f"fetch failed: exit={out.returncode} stderr={out.stderr[:300]}")
    return json.loads(out.stdout)["result"]


def parse(instruments):
    rows = []
    pat = re.compile(r"^BTC-(\d{1,2}[A-Z]{3}\d{2})-(\d+)-([CP])$")
    for inst in instruments:
        m = pat.match(inst["instrument_name"])
        if not m:
            continue
        expiry, strike, cp = m.group(1), int(m.group(2)), m.group(3)
        oi = inst.get("open_interest") or 0.0
        rows.append({"expiry": expiry, "strike": strike, "cp": cp, "oi": oi,
                     "underlying": inst.get("underlying_price")})
    return rows


def nearest_expiry(rows):
    # expiries sorted by Deribit's own date-coding isn't trivial lexically; use a rough day count.
    import datetime
    def to_date(exp):
        return datetime.datetime.strptime(exp, "%d%b%y")
    expiries = sorted(set(r["expiry"] for r in rows), key=to_date)
    return expiries[0] if expiries else None


def max_pain(rows_for_expiry):
    strikes = sorted(set(r["strike"] for r in rows_for_expiry))
    calls = defaultdict(float)
    puts = defaultdict(float)
    for r in rows_for_expiry:
        if r["cp"] == "C":
            calls[r["strike"]] += r["oi"]
        else:
            puts[r["strike"]] += r["oi"]
    best_strike, best_pain = None, None
    for s_settle in strikes:
        pain = 0.0
        for s_k, oi in calls.items():
            if s_settle > s_k:
                pain += (s_settle - s_k) * oi
        for s_k, oi in puts.items():
            if s_settle < s_k:
                pain += (s_k - s_settle) * oi
        if best_pain is None or pain < best_pain:
            best_pain, best_strike = pain, s_settle
    return best_strike


def top_oi_strikes(rows, underlying, n=8, pct_range=0.25):
    agg = defaultdict(float)
    for r in rows:
        if underlying * (1 - pct_range) <= r["strike"] <= underlying * (1 + pct_range):
            agg[r["strike"]] += r["oi"]
    return sorted(agg.items(), key=lambda kv: -kv[1])[:n]


def main():
    data = fetch()
    rows = parse(data)
    underlying = next((r["underlying"] for r in rows if r["underlying"]), None)
    print(f"Underlying (Deribit index): {underlying}")

    exp = nearest_expiry(rows)
    rows_exp = [r for r in rows if r["expiry"] == exp]
    mp = max_pain(rows_exp)
    calls_oi = sum(r["oi"] for r in rows_exp if r["cp"] == "C")
    puts_oi = sum(r["oi"] for r in rows_exp if r["cp"] == "P")
    pc_ratio = puts_oi / calls_oi if calls_oi else None
    print(f"\nProxima expiracao: {exp}")
    print(f"Max pain (strike com menor payout agregado p/ writers): {mp}")
    print(f"Put/Call OI ratio (so esta expiracao): {pc_ratio:.2f} (calls {calls_oi:.0f} / puts {puts_oi:.0f})" if pc_ratio else "n/a")

    print(f"\nTop strikes por OI agregado (todas expiracoes, +/-25% do preco), maiores 'paredes':")
    for strike, oi in top_oi_strikes(rows, underlying):
        dist_pct = (strike / underlying - 1) * 100
        print(f"  {strike:>8}  OI={oi:>8.1f}  ({dist_pct:+.1f}% do preco atual)")


if __name__ == "__main__":
    main()
