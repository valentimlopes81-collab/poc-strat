"""Classifica o regime (trending vs mean-reverting) de NQ (proxy QQQ) e BTC
via Hurst exponent (R/S) + Variance Ratio test, usando dados publicos
(Yahoo Finance para QQQ, Kraken para BTC). Sem dependencias externas.

Uso: python3 backtest/quant/regime.py
"""
import json
import math
import statistics
import subprocess
import sys

QQQ_URL = "https://query1.finance.yahoo.com/v8/finance/chart/QQQ?range=1y&interval=1d"
BTC_URL = "https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440"


def curl_json(url, extra_args=None):
    cmd = ["curl", "-s", "-A", "Mozilla/5.0", "--max-time", "20", url]
    if extra_args:
        cmd[1:1] = extra_args
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0 or not out.stdout.strip():
        raise RuntimeError(f"fetch failed for {url}: exit={out.returncode} stderr={out.stderr[:300]}")
    return json.loads(out.stdout)


def load_qqq():
    d = curl_json(QQQ_URL)
    r = d["chart"]["result"][0]
    closes = r["indicators"]["quote"][0]["close"]
    adj = r["indicators"].get("adjclose", [{}])[0].get("adjclose", closes)
    return [c for c in adj if c is not None]


def load_btc():
    d = curl_json(BTC_URL)
    key = [k for k in d["result"].keys() if k != "last"][0]
    rows = d["result"][key]
    return [float(row[4]) for row in rows]


def log_returns(closes):
    return [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]


def hurst_rs(returns, min_n=8):
    n_total = len(returns)
    max_n = n_total // 2
    ns = sorted(set(int(x) for x in [min_n * (1.3 ** k) for k in range(30)] if min_n <= x <= max_n))
    pts = []
    for n in ns:
        chunks = [returns[i:i + n] for i in range(0, n_total - n + 1, n)]
        chunks = [c for c in chunks if len(c) == n]
        if len(chunks) < 2:
            continue
        rs_vals = []
        for c in chunks:
            mean = statistics.mean(c)
            cum, s = [], 0.0
            for x in c:
                s += x - mean
                cum.append(s)
            R = max(cum) - min(cum)
            S = statistics.pstdev(c)
            if S > 0:
                rs_vals.append(R / S)
        if rs_vals:
            pts.append((math.log(n), math.log(statistics.mean(rs_vals))))
    if len(pts) < 2:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    xm, ym = statistics.mean(xs), statistics.mean(ys)
    num = sum((x - xm) * (y - ym) for x, y in zip(xs, ys))
    den = sum((x - xm) ** 2 for x in xs)
    return num / den if den else None


def variance_ratio(returns, q):
    n = len(returns)
    if n < q * 10:
        return None
    mean = statistics.mean(returns)
    var1 = sum((r - mean) ** 2 for r in returns) / (n - 1)
    k_sums = [sum(returns[i:i + q]) for i in range(0, n - q + 1)]
    mean_k = statistics.mean(k_sums)
    var_q = sum((s - mean_k) ** 2 for s in k_sums) / (len(k_sums) - 1)
    return var_q / (q * var1) if var1 else None


def classify_vr(vr):
    if vr is None:
        return "n/a"
    if vr < 0.7:
        return "mean-reverting (forte)"
    if vr < 0.9:
        return "mean-reverting (leve)"
    if vr <= 1.1:
        return "neutro / random walk"
    if vr <= 1.3:
        return "trending (leve)"
    return "trending (forte)"


def analyze(name, closes):
    rets_all = log_returns(closes)
    lines = [f"### {name} (n={len(closes)} barras diarias)"]
    primary_verdict = None
    for label, window in [("1y", len(rets_all)), ("90d", 90), ("30d", 30)]:
        r = rets_all[-window:] if window < len(rets_all) else rets_all
        if len(r) < 20:
            continue
        h = hurst_rs(r)
        vrs = {q: variance_ratio(r, q) for q in (2, 4, 8) if len(r) >= q * 10}
        vr_str = " / ".join(f"{q}:{v:.2f}" for q, v in vrs.items() if v is not None)
        h_str = f"{h:.2f}" if h else "n/a"
        conf = "" if window != 30 else " (amostra pequena, baixa confianca)"
        lines.append(f"- [{label}] Hurst {h_str} | VR(2/4/8) {vr_str}{conf}")
        if label == "90d" and vrs:
            longest_q = max(vrs.keys())
            primary_verdict = classify_vr(vrs[longest_q])
    verdict_line = f"**Veredicto (90d, lag mais longo): {primary_verdict}**" if primary_verdict else "**Veredicto: dados insuficientes**"
    lines.append(verdict_line)
    return "\n".join(lines), primary_verdict


def main():
    try:
        qqq = load_qqq()
        qqq_txt, qqq_verdict = analyze("NQ (proxy QQQ)", qqq)
    except Exception as e:
        qqq_txt, qqq_verdict = f"### NQ (proxy QQQ)\nERRO a buscar dados: {e}", None

    try:
        btc = load_btc()
        btc_txt, btc_verdict = analyze("BTC (Kraken XBTUSD)", btc)
    except Exception as e:
        btc_txt, btc_verdict = f"### BTC (Kraken XBTUSD)\nERRO a buscar dados: {e}", None

    print(qqq_txt)
    print()
    print(btc_txt)


if __name__ == "__main__":
    main()
