"""COT (Commitment of Traders) para o Nasdaq-100 (NASDAQ MINI, CFTC_209742) --
posicionamento dos leveraged funds (fundos especulativos, o grupo mais
relevante para ler sentimento direcional). Substitui a pesquisa web, que
ficava sempre semanas/meses desatualizada (ver quant_bias.md 10/11).

Fonte: CFTC via OpenBB, sem credencial, atualizado semanalmente (publicado a
sexta, com dados de terca anterior -- atraso normal de ~1 semana, nao e bug).

Uso: python3 backtest/quant/cot_nq.py
"""
import sys

from openbb import obb

CODE = "CFTC_209742"  # NASDAQ MINI - CME


def main():
    df = obb.cftc.cot(code=CODE, report_type="financial", provider="cftc").to_dataframe()
    if df.empty:
        print("Sem dados COT.", file=sys.stderr)
        sys.exit(1)

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) >= 2 else None

    lf_long = latest["leveraged_funds_positions_long"]
    lf_short = latest["leveraged_funds_positions_short"]
    lf_net = lf_long - lf_short
    oi = latest["open_interest_all"]
    lf_net_pct_oi = lf_net / oi * 100 if oi else None

    print(f"Report week: {latest['report_week']} (data: {df.index[-1]})")
    print(f"Open interest total: {oi:,.0f}")
    print(f"Leveraged funds: long={lf_long:,.0f}  short={lf_short:,.0f}  "
          f"net={lf_net:+,.0f}" + (f"  ({lf_net_pct_oi:+.1f}% do OI)" if lf_net_pct_oi is not None else ""))

    if prev is not None:
        d_long = latest["change_in_leveraged_funds_long"]
        d_short = latest["change_in_leveraged_funds_short"]
        prev_net = prev["leveraged_funds_positions_long"] - prev["leveraged_funds_positions_short"]
        print(f"Vs semana anterior ({prev['report_week']}): long {d_long:+,.0f}, short {d_short:+,.0f}  "
              f"(net passou de {prev_net:+,.0f} para {lf_net:+,.0f})")

    am_long = latest["asset_manager_positions_long"]
    am_short = latest["asset_manager_positions_short"]
    print(f"Asset managers (institucional, menos especulativo): long={am_long:,.0f}  "
          f"short={am_short:,.0f}  net={am_long - am_short:+,.0f}")

    if lf_net > 0:
        leitura = "leveraged funds net LONG -- posicionamento especulativo favorece alta"
    elif lf_net < 0:
        leitura = "leveraged funds net SHORT -- posicionamento especulativo favorece baixa"
    else:
        leitura = "leveraged funds neutros"
    print(f"Leitura: {leitura}")


if __name__ == "__main__":
    main()
