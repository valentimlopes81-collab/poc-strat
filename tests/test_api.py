"""Smoke test end-to-end do webhook e do dashboard (sem feed de rede)."""
from __future__ import annotations

import os

os.environ.setdefault("POC_DB_URL", "sqlite:///./test_api.db")


def test_webhook_creates_trade_and_dashboard_renders(tmp_path, monkeypatch):
    monkeypatch.setenv("POC_DB_URL", f"sqlite:///{tmp_path/'t.db'}")
    # Import tardio para apanhar o POC_DB_URL do monkeypatch.
    import importlib
    import app.config, app.db, app.main
    importlib.reload(app.config)
    importlib.reload(app.db)
    importlib.reload(app.main)
    from fastapi.testclient import TestClient

    # Não arrancar o loop de mercado (evita chamadas de rede no teste).
    app.main.app.router.on_startup.clear()
    app.db.init_db()

    with TestClient(app.main.app) as client:
        body = {
            "ticker": "BTCUSDT.P", "side": "long", "price": 61000,
            "zone_pocs": [60800, 61000, 61200], "targets_up": [62500, 63500],
            "targets_down": [59000], "zone_break": 60500,
        }
        r = client.post("/webhook", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "accepted"
        assert data["entries"] == 3
        assert data["targets"] == [62500, 63500]

        # Dashboard renderiza e mostra o símbolo.
        html = client.get("/").text
        assert "BTC/USDT:USDT" in html
        assert "Live Paper Backtest" in html
