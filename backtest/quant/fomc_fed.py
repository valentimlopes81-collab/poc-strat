"""Documentos oficiais do FOMC (minutas, comunicados, press conference, beige
book) direto da Federal Reserve -- substitui a pesquisa web sobre a postura
da Fed/Warsh, que ficava sistematicamente desatualizada (ver quant_bias.md
10/11).

Fonte: Federal Reserve via OpenBB, sem credencial.

Uso: python3 backtest/quant/fomc_fed.py
"""
from openbb import obb

N_RECENT = 5


def main():
    df = obb.federal_reserve.fomc_documents(provider="federal_reserve").to_dataframe()
    df = df.sort_index()

    print(f"Ultimos {N_RECENT} documentos FOMC:")
    for date, row in df.tail(N_RECENT).iterrows():
        print(f"  {date}  {row['doc_type']:<18} {row['url']}")

    last_statement = df[df["doc_type"] == "monetary_policy"].tail(1)
    if not last_statement.empty:
        d = last_statement.index[-1]
        print(f"\nUltimo comunicado de politica monetaria: {d}  {last_statement.iloc[-1]['url']}")

    last_minutes = df[df["doc_type"] == "minutes"].tail(1)
    if not last_minutes.empty:
        d = last_minutes.index[-1]
        print(f"Ultimas minutas publicadas: {d}  {last_minutes.iloc[-1]['url']}")


if __name__ == "__main__":
    main()
