"""Análise de um ticker: SEC + preço + valuation -> resultado (ou erro)."""
from __future__ import annotations

from .config import Assumptions
from .prices import get_price
from .sec import fetch
from .valuation import Fundamentals, value_company


def analyze(ticker: str, a: Assumptions):
    """Devolve (result, error, name). result=None se houver erro."""
    data = fetch(ticker)
    if data.get("error"):
        return None, data["error"], None
    name = data["name"]
    price = get_price(ticker)
    if price is None:
        return None, f"não consegui obter o preço de {ticker}.", name
    if data.get("fcf") is None or not data.get("shares"):
        miss = ", ".join(data.get("missing", [])) or "—"
        return None, f"dados insuficientes na SEC (em falta: {miss}).", name
    if data.get("eps") is None:
        # Sem EPS reportado não há nº de ações fiável (típico de empresas
        # multi-classe: Visa, etc.). Melhor marcar do que dar um 🟢 falso.
        return None, "EPS não reportado na SEC (empresa multi-classe?) — não avaliável de forma fiável.", name
    f = Fundamentals(
        price=price, shares=data["shares"], fcf=data["fcf"],
        net_income=data["net_income"] or 0.0, equity=data["equity"] or 0.0,
        total_debt=data["total_debt"], cash=data["cash"],
        eff_tax=data["eff_tax"], cost_of_debt=data["cost_of_debt"],
        fcf_history=data["fcf_history"],
        revenue=data.get("revenue", 0.0), ebitda=data.get("ebitda"),
        revenue_history=data.get("revenue_history"),
        eps_reported=data.get("eps"),
    )
    return value_company(f, a), None, name
