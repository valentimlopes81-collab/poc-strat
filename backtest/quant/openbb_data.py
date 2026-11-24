"""Acesso a dados via OpenBB Platform para a cadeia de opcoes QQQ
(usado por nq_gex.py e nq_options_levels.py).

Fonte primaria: Cboe (sem credencial, sem rate-limit de crumb, adotada em
10/11 - ver quant_bias.md 10/11). Desde 20/11 a Cboe bloqueia o IP de saida
desta sessao cloud com um 403/Cloudflare persistente (confirmado via curl
direto, nao e rate-limit transitorio - ver quant_bias.md 23/11). Em vez de
tentar contornar o bloqueio anti-bot, adicionado fallback para o provider
'yfinance' (dominio diferente, sem o mesmo bloqueio, mesmas colunas
implied_volatility/open_interest/option_type que o resto do codigo espera -
validado em 24/11, ~2200 contratos validos dentro de 21 dias).
"""
from openbb import obb


def fetch_qqq_chain_df():
    """Devolve (df, spot) com a chain completa QQQ (todas as expiracoes).
    Tenta Cboe primeiro (caso o bloqueio da Cloudflare se resolva), com
    fallback automatico para yfinance se falhar."""
    try:
        df = obb.derivatives.options.chains("QQQ", provider="cboe").to_dataframe()
    except Exception:
        df = obb.derivatives.options.chains("QQQ", provider="yfinance").to_dataframe()
    spot = float(df["underlying_price"].iloc[0])
    return df, spot
