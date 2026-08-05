"""Site de valor intrínseco (DCF + rácios) — EUA, dados SEC EDGAR (grátis)."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from .config import Assumptions
from .prices import get_price
from .sec import fetch
from .valuation import Fundamentals, value_company

app = FastAPI(title="StockVal — Valor Intrínseco")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


def _assumptions(years, growth, terminal_growth, risk_free, beta, erp, tax, cost_of_debt, mos) -> Assumptions:
    a = Assumptions()
    if years is not None: a.years = years
    if growth is not None: a.growth = growth / 100.0
    if terminal_growth is not None: a.terminal_growth = terminal_growth / 100.0
    if risk_free is not None: a.risk_free = risk_free / 100.0
    if beta is not None: a.beta = beta
    if erp is not None: a.erp = erp / 100.0
    if tax is not None: a.tax = tax / 100.0
    if cost_of_debt is not None: a.cost_of_debt = cost_of_debt / 100.0
    if mos is not None: a.margin_of_safety = mos / 100.0
    return a


@app.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    ticker: str = "",
    years: int | None = None, growth: float | None = None, terminal_growth: float | None = None,
    risk_free: float | None = None, beta: float | None = None, erp: float | None = None,
    tax: float | None = None, cost_of_debt: float | None = None, mos: float | None = None,
) -> HTMLResponse:
    a = _assumptions(years, growth, terminal_growth, risk_free, beta, erp, tax, cost_of_debt, mos)
    result, error, name = None, None, None
    ticker = ticker.strip().upper()

    if ticker:
        data = fetch(ticker)
        if data.get("error"):
            error = data["error"]
        else:
            name = data["name"]
            price = get_price(ticker)
            if price is None:
                error = f"não consegui obter o preço de {ticker}."
            elif data.get("fcf") is None or not data.get("shares"):
                error = f"dados insuficientes na SEC para {ticker} (em falta: {', '.join(data.get('missing', [])) or '—'})."
            else:
                f = Fundamentals(
                    price=price, shares=data["shares"], fcf=data["fcf"],
                    net_income=data["net_income"] or 0.0, equity=data["equity"] or 0.0,
                    total_debt=data["total_debt"], cash=data["cash"],
                    eff_tax=data["eff_tax"], cost_of_debt=data["cost_of_debt"],
                    fcf_history=data["fcf_history"],
                )
                result = value_company(f, a)

    # valores dos campos do formulário (em %), a partir dos defaults/inputs
    d = Assumptions()
    form = {
        "years": a.years,
        "growth": round(a.growth * 100, 2),
        "terminal_growth": round(a.terminal_growth * 100, 2),
        "risk_free": round(a.risk_free * 100, 2),
        "beta": a.beta,
        "erp": round(a.erp * 100, 2),
        "tax": round(a.tax * 100, 2),
        "cost_of_debt": round(a.cost_of_debt * 100, 2),
        "mos": round(a.margin_of_safety * 100, 2),
    }
    return templates.TemplateResponse(
        request, "index.html",
        {"ticker": ticker, "name": name, "result": result, "error": error, "form": form},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
