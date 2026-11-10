"""Calcula GEX (gamma exposure) aproximado para NQ via opcoes QQQ (proxy).
Ver gex_common.py para a metodologia e avisos. Chain via Cboe (OpenBB) desde
10/11 — substitui o fetch por crumb a Yahoo, que sofria rate-limit quase todos
os dias (ver quant_bias.md 10/11 para o historico da decisao).

Uso: python3 backtest/quant/nq_gex.py [nq_price_atual]
"""
import datetime
import json
import subprocess
import sys

from gex_common import total_gex_at_spot, find_zero_gamma, strikes_by_abs_gex, call_put_walls
from openbb_data import fetch_qqq_chain_df

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MULTIPLIER = 100.0  # 100 acoes por contrato (equity options standard)


def fetch_nq_price():
    """Busca o ultimo preco do futuro NQ=F via Yahoo (sem crumb, endpoint de chart
    — nao e o endpoint de opcoes que sofria rate-limit, este sempre funcionou bem)."""
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


def sh(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"cmd failed: {cmd} stderr={out.stderr[:300]}")
    return out.stdout


def build_rows(max_days=21):
    df, spot = fetch_qqq_chain_df()
    now = datetime.datetime.utcnow()
    today = now.date()

    rows = []
    zero_dte_rows = []
    for r in df.itertuples():
        dte = (r.expiration - today).days
        if dte < 0 or dte > max_days:
            continue
        iv, oi = r.implied_volatility, r.open_interest
        if not iv or iv <= 0.01 or not oi or oi <= 0:
            continue
        expiry_dt = datetime.datetime.combine(r.expiration, datetime.time(21, 0))
        T = (expiry_dt - now).total_seconds() / (365.25 * 24 * 3600)
        if T <= 0:
            continue
        row = {"strike": float(r.strike), "T": T, "iv": float(iv), "oi": float(oi),
               "cp": "C" if r.option_type == "call" else "P"}
        rows.append(row)
        if dte == 0:
            zero_dte_rows.append(row)
    if len(rows) < 200:
        print(f"AVISO: só {len(rows)} contratos validos (normal e >1000) - dados possivelmente"
              f" desatualizados ou mercado de opcoes fechado. Resultados pouco fiaveis.", file=sys.stderr)
    return rows, zero_dte_rows, spot


def main():
    nq_price = float(sys.argv[1]) if len(sys.argv) > 1 else None
    rows, zero_dte_rows, qqq_spot = build_rows()

    auto_fetched = False
    if not nq_price:
        nq_price = fetch_nq_price()
        auto_fetched = nq_price is not None
    ratio = (nq_price / qqq_spot) if nq_price else None

    print(f"QQQ spot: {qqq_spot}")
    print(f"n contratos usados (expiracoes <=21 dias, IV/OI validos): {len(rows)}")
    if ratio:
        tag = " (auto, NQ=F)" if auto_fetched else ""
        print(f"Preco NQ: {nq_price}{tag}  ->  Racio NQ/QQQ: {ratio:.4f}")
    else:
        print("Sem preco NQ (nem argumento nem auto-fetch) - resultados so em termos QQQ.")

    def fmt_level(qqq_level):
        return f"{qqq_level:,.1f} QQQ" + (f"  (~{qqq_level*ratio:,.0f} NQ)" if ratio else "")

    gex_now = total_gex_at_spot(rows, qqq_spot, MULTIPLIER)
    print(f"\nGEX total ao preco atual: {gex_now:,.0f} (positivo=regime de pin/baixa vol; negativo=regime de maior vol)")

    call_wall, put_wall = call_put_walls(rows, qqq_spot, MULTIPLIER)
    if call_wall:
        print(f"CALL WALL: {fmt_level(call_wall[0])}  (GEX={call_wall[1]:,.0f})")
    if put_wall:
        print(f"PUT WALL:  {fmt_level(put_wall[0])}  (GEX={put_wall[1]:,.0f})")

    flips = find_zero_gamma(rows, qqq_spot, MULTIPLIER)
    if flips:
        nearest = min(flips, key=lambda f: abs(f - qqq_spot))
        direction = "acima" if nearest > qqq_spot else "abaixo"
        print(f"Ponto de zero-gamma mais proximo: {fmt_level(nearest)} ({direction} do spot)")
    else:
        print("Sem cruzamento de zero-gamma na janela testada (+/-30%).")

    print("\nStrikes com maior |GEX| (paredes de gamma mais fortes, todas as expiracoes <=21d):")
    for strike, val in strikes_by_abs_gex(rows, qqq_spot):
        tag = "resistencia/pin (call-heavy)" if val > 0 else "suporte/acelerador (put-heavy)"
        print(f"  {fmt_level(strike)}  GEX={val:>14,.0f}  {tag}")

    if zero_dte_rows:
        print(f"\n--- 0DTE (so opcoes que expiram HOJE, n={len(zero_dte_rows)}) ---")
        gex_0dte = total_gex_at_spot(zero_dte_rows, qqq_spot, MULTIPLIER)
        print(f"GEX 0DTE ao preco atual: {gex_0dte:,.0f}")
        walls_0dte = strikes_by_abs_gex(zero_dte_rows, qqq_spot, top_n=5)
        call_res = max((w for w in walls_0dte if w[1] > 0), key=lambda w: w[1], default=None)
        put_sup = min((w for w in walls_0dte if w[1] < 0), key=lambda w: w[1], default=None)
        gamma_wall = walls_0dte[0] if walls_0dte else None
        if call_res:
            print(f"Call Resistance 0DTE: {fmt_level(call_res[0])}  GEX={call_res[1]:,.0f}")
        if put_sup:
            print(f"Put Support 0DTE: {fmt_level(put_sup[0])}  GEX={put_sup[1]:,.0f}")
        if gamma_wall:
            print(f"Gamma Wall 0DTE (maior |GEX|): {fmt_level(gamma_wall[0])}  GEX={gamma_wall[1]:,.0f}")
    else:
        print("\n--- 0DTE: sem expiracao a terminar hoje (ou mercado fechado) ---")


if __name__ == "__main__":
    main()
