"""Site de valor intrínseco (DCF + rácios) — EUA, dados SEC EDGAR (grátis)."""
from __future__ import annotations

import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from .analyze import analyze
from .config import Assumptions

app = FastAPI(title="StockVal — Valor Intrínseco")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

# --- Watchlist do screener (persistida em ficheiro, com seed por omissão) ---
_WL_FILE = os.getenv("STOCKVAL_WATCHLIST", str(Path(__file__).parent.parent / "watchlist.txt"))
_DEFAULT_WL = (
    # originais do utilizador
    "AAPL, TSLA, NVDA, MSFT, META, GOOGL, AMZN, AMD, PLTR, MSTR, NKE, LMT, CROX, "
    "XPEV, JPM, INTC, PFE, NFLX, ORCL, SOFI, HIMS, UNH, RGTI, TSM, CVX, SPCX, "
    # valor/qualidade adicionadas (US, FCF positivo, cross-setor)
    "KO, PEP, PG, MDLZ, MO, JNJ, MRK, ABBV, BMY, GILD, MDT, CVS, MCD, SBUX, HD, TGT, DIS, "
    "CAT, DE, UPS, RTX, MMM, CSCO, QCOM, IBM, MU, XOM, COP, OXY, V, PYPL, WMT")


def _load_watchlist() -> str:
    try:
        txt = Path(_WL_FILE).read_text().strip()
        return txt or _DEFAULT_WL
    except OSError:
        return _DEFAULT_WL


def _save_watchlist(text: str) -> None:
    try:
        Path(_WL_FILE).write_text(text.strip())
    except OSError:
        pass


def _parse_tickers(text: str) -> list[str]:
    seen, out = set(), []
    for t in re.split(r"[,\s]+", text.upper()):
        t = t.strip()
        if t and t not in seen:
            seen.add(t)
            out.append(t)
    return out[:60]  # limite de sanidade


# Cache simples por ticker (fundamentais mudam devagar): TTL 6h.
_cache: dict[str, tuple[float, dict]] = {}
_TTL = 6 * 3600


def _row_for(ticker: str) -> dict:
    now = time.time()
    hit = _cache.get(ticker)
    if hit and now - hit[0] < _TTL:
        return hit[1]
    result, error, name = analyze(ticker, Assumptions())
    if error:
        row = {"ticker": ticker, "name": name or ticker, "error": error}
    else:
        row = {
            "ticker": ticker, "name": name, "error": None,
            "score": result["score"], "opportunity": result["opportunity"],
            "emoji": result["opportunity_emoji"], "mos": result["margin_of_safety"],
            "upside": result["upside"], "conflict": result["conflict"],
            "pe": result["ratios"]["pe"], "ev_ebitda": result["ratios"]["ev_ebitda"],
            "roe": result["ratios"]["roe"],
        }
    _cache[ticker] = (now, row)
    return row


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
        result, error, name = analyze(ticker, a)

    # valores dos campos do formulário (em %), a partir dos defaults/inputs
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


@app.get("/screener", response_class=HTMLResponse)
async def screener(request: Request, tickers: str = "") -> HTMLResponse:
    if tickers.strip():
        _save_watchlist(tickers)
        wl_text = tickers.strip()
    else:
        wl_text = _load_watchlist()
    lst = _parse_tickers(wl_text)

    rows: list[dict] = []
    if lst:
        with ThreadPoolExecutor(max_workers=6) as ex:
            rows = list(ex.map(_row_for, lst))
    # ordena: válidas por score desc; erros no fim.
    rows.sort(key=lambda r: (r.get("error") is not None, -(r.get("score") if r.get("score") is not None else -1)))

    n_forte = sum(1 for r in rows if r.get("opportunity") == "forte")
    n_vigiar = sum(1 for r in rows if r.get("opportunity") == "vigiar")
    return templates.TemplateResponse(
        request, "screener.html",
        {"rows": rows, "watchlist": wl_text, "n_forte": n_forte, "n_vigiar": n_vigiar,
         "n_total": len(rows)},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
