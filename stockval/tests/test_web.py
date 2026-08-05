"""Smoke test da web com dados simulados (sem rede)."""
from __future__ import annotations

import app.main as m
from fastapi.testclient import TestClient

_FAKE = {
    "name": "Apple Inc.", "cik": 320193,
    "fcf": 100_000e6, "cfo": 110_000e6, "capex": 10_000e6,
    "net_income": 95_000e6, "equity": 60_000e6,
    "total_debt": 110_000e6, "cash": 60_000e6, "shares": 15_000e6,
    "eff_tax": 0.15, "cost_of_debt": 0.03,
    "fcf_history": [80_000e6, 90_000e6, 100_000e6], "missing": [],
}


def test_landing_page():
    c = TestClient(m.app)
    html = c.get("/").text
    assert "Valor Intrínseco" in html
    assert "Pressupostos" in html


def test_valuation_page(monkeypatch):
    monkeypatch.setattr(m, "fetch", lambda t: dict(_FAKE))
    monkeypatch.setattr(m, "get_price", lambda t: 180.0)
    c = TestClient(m.app)
    html = c.get("/?ticker=AAPL").text
    assert "Apple Inc." in html
    assert "valor intrínseco" in html.lower()
    assert "WACC" in html
    assert "Rácios" in html


def test_error_when_ticker_missing_data(monkeypatch):
    bad = dict(_FAKE); bad["fcf"] = None; bad["missing"] = ["FCF"]
    monkeypatch.setattr(m, "fetch", lambda t: bad)
    monkeypatch.setattr(m, "get_price", lambda t: 180.0)
    c = TestClient(m.app)
    html = c.get("/?ticker=XYZ").text
    assert "insuficientes" in html
