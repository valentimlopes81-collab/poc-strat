"""Volatilidade realizada (do nosso proprio historico de precos QQQ) vs
implied (ATM da chain, via iv_surface.py) -- mostra se as opcoes estao a
precificar mais ou menos movimento do que o que realmente aconteceu. Zero
custo de API adicional: reusa ficheiros que price_history.py e iv_surface.py
ja escrevem.

Uso: python3 backtest/quant/vol_compare.py (correr depois desses dois)
Escreve terminal/public/data/vol_compare_nq.json.
"""
import json
import math

OUT_DIR = "terminal/public/data"
WINDOW = 20  # dias, janela da vol realizada (rolling)


def realized_vol_series(daily_candles, window=WINDOW):
    closes = [c["close"] for c in daily_candles]
    times = [c["time"] for c in daily_candles]
    rets = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]
    rows = []
    for i in range(window, len(rets) + 1):
        window_rets = rets[i - window:i]
        mean = sum(window_rets) / window
        var = sum((r - mean) ** 2 for r in window_rets) / (window - 1)
        ann_vol = math.sqrt(var * 252) * 100
        rows.append({"time": times[i], "value": round(ann_vol, 2)})
    return rows


def main():
    with open(f"{OUT_DIR}/price_nq_daily.json") as f:
        daily = json.load(f)
    rv_rows = realized_vol_series(daily)

    implied_now = None
    try:
        with open(f"{OUT_DIR}/iv_term_nq.json") as f:
            term = json.load(f)
        if term["rows"]:
            # ~30 DTE, o prazo convencional para comparar com vol realizada
            # (o mesmo horizonte que o VIX usa) -- evita o 0DTE, cuja IV e
            # ruidosa perto da expiracao e nao e uma boa leitura de "implied".
            implied_now = min(term["rows"], key=lambda r: abs(r["dte"] - 30))
    except FileNotFoundError:
        pass

    out = {"realized": rv_rows, "implied_atm_now": implied_now}
    with open(f"{OUT_DIR}/vol_compare_nq.json", "w") as f:
        json.dump(out, f, indent=2)
    tag = f", implied ATM {implied_now['atm_iv']}% ({implied_now['dte']}d)" if implied_now else ""
    print(f"Vol compare NQ: {len(rv_rows)} pontos de vol realizada{tag}")


if __name__ == "__main__":
    main()
