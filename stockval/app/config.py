"""Pressupostos por omissão do valuation (defaults sensatos, todos editáveis)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Assumptions:
    years: int = 10                 # horizonte de projeção do DCF
    growth: float = 0.08            # crescimento anual do FCF na 1ª fase (8%)
    terminal_growth: float = 0.025  # crescimento perpétuo no valor terminal (2.5%)
    erp: float = 0.05               # prémio de risco de mercado (rm - rf)
    risk_free: float = 0.04         # taxa sem risco (~10Y) (4%)
    beta: float = 1.0               # beta (default neutro; editável)
    tax: float = 0.21               # taxa de imposto (fallback 21%)
    cost_of_debt: float = 0.05      # custo da dívida (fallback 5%)
    margin_of_safety: float = 0.30  # margem de segurança desejada (30%)
    # Limites de sanidade para o crescimento auto-derivado do histórico.
    growth_cap: float = 0.15
    growth_floor: float = 0.0
