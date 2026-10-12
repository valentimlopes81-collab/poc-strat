"""Calcula GEX (gamma exposure) aproximado para NQ via opcoes QQQ (proxy).
Ver gex_common.py para a metodologia e avisos. Yahoo exige cookie+crumb.

Uso: python3 backtest/quant/nq_gex.py [nq_price_atual]
"""
import datetime
import json
import subprocess
import sys
import tempfile

from gex_common import total_gex_at_spot, find_zero_gamma, strikes_by_abs_gex, call_put_walls

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MULTIPLIER = 100.0  # 100 acoes por contrato (equity options standard)


def sh(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"cmd failed: {cmd} stderr={out.stderr[:300]}")
    return out.stdout


def get_crumb_and_cookies(cookiejar):
    sh(["curl", "-s", "-c", cookiejar, "-A", UA, "https://fc.yahoo.com", "-o", "/dev/null", "--max-time", "15"])
    return sh(["curl", "-s", "-b", cookiejar, "-c", cookiejar, "-A", UA,
               "https://query2.finance.yahoo.com/v1/test/getcrumb", "--max-time", "15"]).strip()


def fetch_chain(symbol, cookiejar, crumb, date=None):
    url = f"https://query1.finance.yahoo.com/v7/finance/options/{symbol}?crumb={crumb}"
    if date:
        url += f"&date={date}"
    raw = sh(["curl", "-s", "-b", cookiejar, "-A", UA, url, "--max-time", "20"])
    return json.loads(raw)


def build_rows(cookiejar, crumb, max_days=45):
    now = datetime.datetime.utcnow()
    d0 = fetch_chain("QQQ", cookiejar, crumb)
    result = d0["optionChain"]["result"][0]
    spot = result["quote"]["regularMarketPrice"]
    exp_dates = [e for e in result["expirationDates"] if (datetime.datetime.utcfromtimestamp(e) - now).days <= max_days]

    rows = []
    zero_dte_rows = []
    for i, exp in enumerate(exp_dates):
        d = fetch_chain("QQQ", cookiejar, crumb, date=exp) if i > 0 else d0
        opts = d["optionChain"]["result"][0]["options"][0]
        expiry_dt = datetime.datetime.utcfromtimestamp(exp) + datetime.timedelta(hours=21)
        T = (expiry_dt - now).total_seconds() / (365.25 * 24 * 3600)
        if T <= 0:
            continue
        is_0dte = datetime.datetime.utcfromtimestamp(exp).date() == now.date()
        for c in opts["calls"]:
            iv = c.get("impliedVolatility")
            oi = c.get("openInterest") or 0
            if iv and iv > 0.01 and oi > 0:
                row = {"strike": c["strike"], "T": T, "iv": iv, "oi": oi, "cp": "C"}
                rows.append(row)
                if is_0dte:
                    zero_dte_rows.append(row)
        for p in opts["puts"]:
            iv = p.get("impliedVolatility")
            oi = p.get("openInterest") or 0
            if iv and iv > 0.01 and oi > 0:
                row = {"strike": p["strike"], "T": T, "iv": iv, "oi": oi, "cp": "P"}
                rows.append(row)
                if is_0dte:
                    zero_dte_rows.append(row)
    if len(rows) < 200:
        print(f"AVISO: só {len(rows)} contratos validos (normal e >1000) - dados possivelmente"
              f" desatualizados (ex.: antes da abertura do mercado de opcoes, 13:30 UTC). Resultados pouco fiaveis.", file=sys.stderr)
    return rows, zero_dte_rows, spot


def main():
    nq_price = float(sys.argv[1]) if len(sys.argv) > 1 else None
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tf:
        cookiejar = tf.name
    crumb = get_crumb_and_cookies(cookiejar)
    rows, zero_dte_rows, qqq_spot = build_rows(cookiejar, crumb)
    ratio = (nq_price / qqq_spot) if nq_price else None

    print(f"QQQ spot: {qqq_spot}")
    print(f"n contratos usados (expiracoes <=45 dias, IV/OI validos): {len(rows)}")
    if ratio:
        print(f"Racio NQ/QQQ: {ratio:.4f}")
    else:
        print("Sem preco NQ fornecido - resultados so em termos QQQ.")

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

    print("\nStrikes com maior |GEX| (paredes de gamma mais fortes, todas as expiracoes <=45d):")
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
