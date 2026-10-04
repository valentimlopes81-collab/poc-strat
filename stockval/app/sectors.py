"""Mapa ticker -> setor, para comparar múltiplos entre pares parecidos.

Agrupado por modelo de negócio (não GICS estrito) para as comparações fazerem
sentido: pagamentos != bancos, semis != software, etc.
"""
from __future__ import annotations

_GROUPS = {
    "Semicondutores": ["NVDA", "AMD", "INTC", "TSM", "MU", "QCOM"],
    "Software & Tech": ["AAPL", "MSFT", "ORCL", "IBM", "CSCO", "PLTR"],
    "Internet & Media": ["GOOGL", "META", "NFLX", "DIS"],
    "Consumo Discricionário": ["AMZN", "TSLA", "HD", "MCD", "SBUX", "NKE", "CROX", "TGT", "XPEV"],
    "Staples": ["WMT", "KO", "PEP", "PG", "MDLZ", "MO"],
    "Saúde": ["UNH", "JNJ", "MRK", "ABBV", "BMY", "GILD", "PFE", "MDT", "CVS", "HIMS"],
    "Industriais": ["CAT", "DE", "UPS", "RTX", "LMT", "MMM"],
    "Energia": ["XOM", "CVX", "COP", "OXY"],
    "Fintech & Pagamentos": ["V", "PYPL", "SOFI"],
    "Financeiras": ["JPM", "MSTR"],
    "Especulativas": ["RGTI", "SPCX"],
}

SECTOR: dict[str, str] = {t: sec for sec, tickers in _GROUPS.items() for t in tickers}


def sector_of(ticker: str) -> str:
    return SECTOR.get(ticker.upper(), "Outro")


# Financeiras de "balanço pesado" — bancos, emissoras de cartão/crédito,
# seguradoras subscritoras, corretoras com livro de crédito a clientes (margin
# lending). Nestas, a "dívida" na SEC é o próprio negócio (depósitos, apólices,
# crédito a clientes/margin loans), não alavancagem no sentido industrial — por
# isso rácios como EV/EBITDA, Net debt/EBITDA, interest coverage e ROIC vs WACC
# (pensados para empresas não-financeiras) ficam sempre distorcidos (ex.: AXP
# mostrava Net debt/EBITDA de ~10x e interest coverage de 0.4x só por isto, não
# por ser arriscada). Excluídos do score E dos checklists para estas; o que
# continua a fazer sentido (ROE, margem líquida, P/E, P/B, PEG) mantém-se.
#   - JPM/GS/MS/BAC/C/WFC/PLBC: bancos "normais" (depósitos + crédito).
#   - AXP/SOFI: emissoras de cartão/crédito com livro próprio.
#   - CB: seguradora subscritora (apólices + reservas de sinistro no passivo).
#   - BRK.B: conglomerado com float de seguros gigante (GEICO + resseguro) —
#     o balanço é dominado por isso, não faz sentido tratar como industrial.
#   - LMND: insurtech, mesma lógica da CB em escala menor.
#   - IBKR/HOOD: corretoras com livro de margin lending relevante (receita de
#     juros líquidos é central ao negócio, não só comissões).
# Não inclui financeiras "asset-light" — sem livro de crédito/apólices, os
# rácios normais funcionam bem: MCO, SPGI, MSCI, NDAQ, BLK, AJG, AON, MORN,
# V, MA, PYPL (sobretudo rede/plataforma, exposição de crédito pequena),
# COIN (sobretudo comissões/subscrição; passivos de custódia não são um livro
# de crédito a gerar juros como um banco).
BALANCE_SHEET_HEAVY = {
    "JPM", "GS", "MS", "BAC", "C", "WFC", "PLBC", "AXP", "SOFI", "CB",
    "BRK.B", "LMND", "IBKR", "HOOD",
}


def is_balance_sheet_heavy(ticker: str) -> bool:
    return ticker.upper() in BALANCE_SHEET_HEAVY


# Capital-intensivos "alavancados por desenho" — o negócio financia ativos de
# longa duração (centrais elétricas/rede, navios) com dívida de propósito, e
# isso é normal/saudável, não um sinal de risco. Ao contrário das financeiras
# acima, aqui só a alavancagem (Dívida líq./Equity) é que fica fora de
# contexto — EV/EBITDA, net debt/EBITDA e interest coverage continuam a ser
# métricas-padrão e úteis nestes setores (são usadas pelos próprios analistas
# do setor), por isso mantêm-se.
#   - NEE/AEP/CEG/VST/EIX/NRG/DUK/SO: utilities reguladas/produtoras de
#     eletricidade — cash flows estáveis/regulados sustentam alavancagem alta
#     por desenho.
#   - RCL: cruzeiros — navios financiados com dívida é o modelo da indústria.
#   - GSL: leasing de navporta-contentores — negócio É emprestar/alugar
#     ativos financiados a dívida, D/E alto não indica aperto financeiro.
LEVERAGED_BY_DESIGN = {"NEE", "AEP", "CEG", "VST", "EIX", "NRG", "DUK", "SO", "RCL", "GSL"}


def is_leveraged_by_design(ticker: str) -> bool:
    return ticker.upper() in LEVERAGED_BY_DESIGN


def leverage_ratio_exempt(ticker: str) -> bool:
    """True se o rácio Dívida líq./Equity deve ficar fora do score para este
    ticker (balanço pesado OU alavancado por desenho — qualquer um dos dois
    torna D/E alto normal/saudável em vez de um sinal de risco)."""
    return is_balance_sheet_heavy(ticker) or is_leveraged_by_design(ticker)
