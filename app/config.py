"""Configuração central da estratégia e do paper trading.

Todos os parâmetros que definem o comportamento do motor vivem aqui, para que
a lógica de negócio não tenha números mágicos espalhados.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    # --- Conta virtual / sizing ---
    account_start_usd: float = 5_000.0
    # Risco por trade em fração da conta. 2% de 5k = $100.
    risk_pct: float = 0.02

    # --- Estratégia ---
    # Zonas de POC mais próximas que isto (em %) não contam como alvo de TP.
    min_target_dist_pct: float = 1.0
    # Distribuição do fecho de posição pelos três alvos.
    tp_split: tuple[float, float, float] = (0.30, 0.40, 0.30)
    # Quantas ordens limite espalhar pela zona, no máximo (uma por POC da zona).
    max_entry_orders: int = 8
    # Distância máxima (%) a que um POC do lado da entrada ainda conta como zona.
    # Long -> suportes abaixo; Short -> resistências acima. Alinhado com o gatilho.
    entry_reach_pct: float = 3.0
    # Distância máxima (%) do stop à borda do cluster de entrada. O stop encaixa
    # no POC seguinte se ele estiver dentro deste limite; senão corta aqui, para
    # o risco/recompensa não ficar mau quando os POCs estão muito espaçados.
    max_stop_pct: float = 1.5
    # Validade das ordens limite por encher, em minutos. 2 horas.
    entry_ttl_minutes: int = 120

    # --- Mercado / feed ---
    exchange_id: str = "bybit"
    # Bybit USDT perpétuos usam o sufixo :USDT em ccxt (ex.: "BTC/USDT:USDT").
    quote: str = "USDT"
    # Timeframe usado para confirmar o "fecho de vela" que valida o corte.
    break_timeframe: str = "30m"
    # Intervalo do loop de polling de preços, em segundos.
    poll_interval_sec: int = 15

    # --- Persistência / web ---
    db_url: str = field(default_factory=lambda: os.getenv("POC_DB_URL", "sqlite:///poc_strat.db"))
    webhook_secret: str = field(default_factory=lambda: os.getenv("POC_WEBHOOK_SECRET", ""))


settings = Settings()
