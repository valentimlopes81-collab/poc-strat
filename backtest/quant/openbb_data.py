"""Acesso a dados via OpenBB Platform — substitui o fetch por crumb a Yahoo
para a cadeia de opcoes QQQ (usado por nq_gex.py e nq_options_levels.py).
Fonte: Cboe (sem credencial, sem rate-limit de crumb). Adotado em 10/11 depois
de validar que a chain da Cboe tem IV/delta/gamma/OI reais e liquidos perto do
dinheiro, incluindo 0DTE (ver quant_bias.md 10/11 para o historico da decisao).
"""
from openbb import obb


def fetch_qqq_chain_df():
    """Devolve (df, spot) com a chain completa QQQ (todas as expiracoes)."""
    df = obb.derivatives.options.chains("QQQ", provider="cboe").to_dataframe()
    spot = float(df["underlying_price"].iloc[0])
    return df, spot
