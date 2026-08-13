"""Smoke test da web com dados simulados (sem rede)."""
from __future__ import annotations

import app.analyze as an
import app.main as m
from fastapi.testclient import TestClient

_FAKE = {
    "name": "Apple Inc.", "cik": 320193,
    "fcf": 100_000e6, "cfo": 110_000e6, "capex": 10_000e6,
    "net_income": 95_000e6, "equity": 60_000e6,
    "total_debt": 110_000e6, "cash": 60_000e6, "shares": 15_000e6,
    "eff_tax": 0.15, "cost_of_debt": 0.03,
    "fcf_history": [80_000e6, 90_000e6, 100_000e6], "missing": [],
    "revenue": 390_000e6, "ebitda": 130_000e6,
    "revenue_history": [350_000e6, 370_000e6, 390_000e6],
}


def test_landing_page():
    html = TestClient(m.app).get("/").text
    assert "Valor Intrínseco" in html
    assert "Screener" in html


def test_valuation_page(monkeypatch):
    monkeypatch.setattr(an, "fetch", lambda t: dict(_FAKE))
    monkeypatch.setattr(an, "get_price", lambda t: 180.0)
    html = TestClient(m.app).get("/?ticker=AAPL").text
    assert "Apple Inc." in html
    assert "OPORTUNIDADE" in html.upper()
    assert "Qualidade" in html and "Coerência" in html


def test_error_when_ticker_missing_data(monkeypatch):
    bad = dict(_FAKE); bad["fcf"] = None; bad["missing"] = ["FCF"]
    monkeypatch.setattr(an, "fetch", lambda t: bad)
    monkeypatch.setattr(an, "get_price", lambda t: 180.0)
    html = TestClient(m.app).get("/?ticker=XYZ").text
    assert "insuficientes" in html


def test_screener(monkeypatch):
    monkeypatch.setattr(an, "fetch", lambda t: dict(_FAKE, name=t))
    monkeypatch.setattr(an, "get_price", lambda t: 180.0)
    m._cache.clear()
    html = TestClient(m.app).get("/screener?tickers=AAPL,MSFT").text
    assert "Screener" in html
    assert "AAPL" in html and "MSFT" in html
    assert "Veredicto" in html
