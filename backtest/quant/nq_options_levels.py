"""Extrai niveis de liquidez/posicionamento a partir das opcoes QQQ (proxy de NQ)
via Yahoo Finance: concentracao de open interest por strike (paredes), max pain
da proxima expiracao. Estrike de QQQ e traduzido para "equivalente NQ" usando o
racio de preco atual entre os dois (aproximado, nao e o mesmo instrumento).

Yahoo exige cookie + crumb (CSRF) para este endpoint - o script trata disso.

Uso: python3 backtest/quant/nq_options_levels.py [nq_price_atual]
Se nq_price_atual nao for dado, tenta obter o do proprio QQQ (chart endpoint)
e aplica um racio generico documentado no codigo (ajustar se desatualizado).
"""
import json
import subprocess
import sys
import tempfile
from collections import defaultdict

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def sh(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"cmd failed: {cmd} stderr={out.stderr[:300]}")
    return out.stdout


def get_crumb_and_cookies(cookiejar):
    sh(["curl", "-s", "-c", cookiejar, "-A", UA, "https://fc.yahoo.com", "-o", "/dev/null", "--max-time", "15"])
    crumb = sh(["curl", "-s", "-b", cookiejar, "-c", cookiejar, "-A", UA,
                "https://query2.finance.yahoo.com/v1/test/getcrumb", "--max-time", "15"]).strip()
    return crumb


def fetch_chain(symbol, cookiejar, crumb, date=None):
    url = f"https://query1.finance.yahoo.com/v7/finance/options/{symbol}?crumb={crumb}"
    if date:
        url += f"&date={date}"
    raw = sh(["curl", "-s", "-b", cookiejar, "-A", UA, url, "--max-time", "20"])
    return json.loads(raw)


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
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tf:
        cookiejar = tf.name
    crumb = get_crumb_and_cookies(cookiejar)

    d0 = fetch_chain("QQQ", cookiejar, crumb)
    result = d0["optionChain"]["result"][0]
    qqq_price = result["quote"]["regularMarketPrice"]
    exp_dates = result["expirationDates"][:6]  # proximas ~6 expiracoes (daily/weekly QQQ)

    ratio = (nq_price_arg / qqq_price) if nq_price_arg else None
    print(f"QQQ price: {qqq_price}")
    if ratio:
        print(f"NQ price fornecido: {nq_price_arg} -> racio NQ/QQQ: {ratio:.4f}")
    else:
        print("Sem preco NQ fornecido (passa como argumento) - estrikes so em termos QQQ.")

    agg_oi = defaultdict(float)
    near_calls, near_puts = None, None
    for i, exp in enumerate(exp_dates):
        d = fetch_chain("QQQ", cookiejar, crumb, date=exp) if i > 0 else d0
        opts = d["optionChain"]["result"][0]["options"][0]
        calls, puts = opts["calls"], opts["puts"]
        if i == 0:
            near_calls, near_puts = calls, puts
        for c in calls:
            agg_oi[c["strike"]] += c.get("openInterest") or 0
        for p in puts:
            agg_oi[p["strike"]] += p.get("openInterest") or 0

    mp = max_pain(near_calls, near_puts)
    calls_oi_total = sum(c.get("openInterest") or 0 for c in near_calls)
    puts_oi_total = sum(p.get("openInterest") or 0 for p in near_puts)
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
