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
    # Risco por trade em fração da conta (padrão 1%). Exceções por moeda abaixo.
    risk_pct: float = 0.01
    # Risco específico por moeda-base (ex.: BTC continua a 2%).
    risk_by_coin: dict = field(default_factory=lambda: {"BTC": 0.02})

    # --- Gestão de posição ---
    # Mover o stop para o preço de entrada (breakeven) ao atingir 1R de lucro.
    use_breakeven: bool = True

    def risk_for(self, base_coin: str) -> float:
        return self.risk_by_coin.get(base_coin.upper(), self.risk_pct)

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
    # Cancelamento das ordens limite por encher: quando o preço se afasta da
    # zona na direção do lucro (front-run) em pelo menos esta %, medida a partir
    # do preço no momento do alerta. Substitui o antigo cancelamento por tempo.
    cancel_move_pct: float = 2.0

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
