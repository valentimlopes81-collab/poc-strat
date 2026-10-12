"""Calcula GEX (gamma exposure) aproximado para BTC a partir de opcoes Deribit.
Ver gex_common.py para a metodologia e avisos. Dados publicos, sem autenticacao.

Uso: python3 backtest/quant/btc_gex.py
"""
import datetime
import json
import re
import subprocess

from gex_common import total_gex_at_spot, find_zero_gamma, strikes_by_abs_gex, call_put_walls

URL = "https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option"


def fetch():
    out = subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", "--max-time", "20", URL],
                          capture_output=True, text=True, timeout=30)
    if out.returncode != 0 or not out.stdout.strip():
        raise RuntimeError(f"fetch failed: {out.stderr[:300]}")
    return json.loads(out.stdout)["result"]


def build_rows(instruments, max_days=60):
    now = datetime.datetime.utcnow()
    pat = re.compile(r"^BTC-(\d{1,2}[A-Z]{3}\d{2})-(\d+)-([CP])$")
    rows, underlying = [], None
    for inst in instruments:
        m = pat.match(inst["instrument_name"])
        if not m:
            continue
        expiry_s, strike, cp = m.group(1), int(m.group(2)), m.group(3)
        try:
            expiry_dt = datetime.datetime.strptime(expiry_s, "%d%b%y") + datetime.timedelta(hours=8)
        except ValueError:
            continue
        T = (expiry_dt - now).total_seconds() / (365.25 * 24 * 3600)
        if T <= 0 or T * 365.25 > max_days:
            continue
        iv = inst.get("mark_iv")
        oi = inst.get("open_interest") or 0.0
        if not iv or oi <= 0:
            continue
        rows.append({"strike": strike, "T": T, "iv": iv / 100.0, "oi": oi, "cp": cp})
        if inst.get("underlying_price"):
            underlying = inst["underlying_price"]
    return rows, underlying


def main():
    instruments = fetch()
    rows, spot = build_rows(instruments)
    print(f"Spot (Deribit index): {spot}")
    print(f"n contratos usados (expiracoes <=60 dias, IV/OI validos): {len(rows)}")

    gex_now = total_gex_at_spot(rows, spot)
    print(f"\nGEX total ao preco atual: {gex_now:,.0f} (positivo=regime de pin/baixa vol; negativo=regime de maior vol)")

    call_wall, put_wall = call_put_walls(rows, spot)
    if call_wall:
        print(f"CALL WALL: {call_wall[0]:,.0f}  (GEX={call_wall[1]:,.0f})")
    if put_wall:
        print(f"PUT WALL:  {put_wall[0]:,.0f}  (GEX={put_wall[1]:,.0f})")

    flips = find_zero_gamma(rows, spot)
    if flips:
        print(f"Ponto(s) de zero-gamma / 'flip' (onde o regime muda): {[round(f, 0) for f in flips]}")
        nearest = min(flips, key=lambda f: abs(f - spot))
        direction = "acima" if nearest > spot else "abaixo"
        print(f"  -> mais proximo do preco atual: {nearest:,.0f} ({direction} do spot)")
    else:
        print("Sem cruzamento de zero-gamma na janela testada (+/-30%).")

    print("\nStrikes com maior |GEX| (paredes de gamma mais fortes):")
    for strike, val in strikes_by_abs_gex(rows, spot):
        tag = "resistencia/pin (call-heavy)" if val > 0 else "suporte/acelerador (put-heavy)"
        print(f"  {strike:>8}  GEX={val:>14,.0f}  {tag}")


if __name__ == "__main__":
    main()
