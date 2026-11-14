"""Volatilidade realizada (EWMA, do nosso proprio historico de precos QQQ) vs
implied (ATM da chain, via iv_surface.py) -- mostra se as opcoes estao a
precificar mais ou menos movimento do que o que realmente aconteceu. Zero
custo de API adicional: reusa ficheiros que price_history.py e iv_surface.py
ja escrevem.

Realized vol usa EWMA (RiskMetrics, lambda=0.94) em vez da vol historica
simples (rolling window) -- mesma memoria de ~17 dias, mas sem o "cliff":
a vol historica simples salta quando um dia de choque sai da janela, mesmo
que nada tenha mudado no mercado; o EWMA esquece-o suavemente.

Uso: python3 backtest/quant/vol_compare.py (correr depois desses dois)
Escreve terminal/public/data/vol_compare_nq.json.
"""
import json
import math

OUT_DIR = "terminal/public/data"
SEED_WINDOW = 20  # dias, janela so para a variancia inicial (seed) do EWMA
LAMBDA = 0.94  # RiskMetrics, memoria de ~17 dias -- reage rapido a choques e
# esquece-os sem o "cliff" da vol historica simples (quando um dia de crash
# sai da janela rolling e a vol cai de repente sem nada ter mudado no mercado)


def realized_vol_series(daily_candles, lam=LAMBDA, seed_window=SEED_WINDOW):
    """EWMA (RiskMetrics): var_d = lam*var_{d-1} + (1-lam)*ret_{d-1}^2, onde
    ret_{d-1} e o retorno que completa no dia d (ja conhecido nesse dia).
    Seed = variancia simples dos primeiros `seed_window` retornos, que fica
    associada ao dia seed_window."""
    closes = [c["close"] for c in daily_candles]
    times = [c["time"] for c in daily_candles]
    rets = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]
    if len(rets) <= seed_window:
        return []

    seed_rets = rets[:seed_window]
    mean = sum(seed_rets) / seed_window
    var = sum((r - mean) ** 2 for r in seed_rets) / (seed_window - 1)

    rows = [{"time": times[seed_window], "value": round(math.sqrt(var * 252) * 100, 2)}]
    for d in range(seed_window + 1, len(closes)):
        var = lam * var + (1 - lam) * rets[d - 1] ** 2
        ann_vol = math.sqrt(var * 252) * 100
        rows.append({"time": times[d], "value": round(ann_vol, 2)})
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
