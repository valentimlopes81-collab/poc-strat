"""Contrato do payload que o alerta do TradingView envia no webhook.

O indicador Pine serializa os níveis de POC em JSON e envia-os aqui. Estes
níveis são o que permite ao motor colocar as entradas espalhadas e definir os
alvos — sem eles o backend estaria a adivinhar.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AlertPayload(BaseModel):
    ticker: str = Field(..., description="Símbolo tal como vem do TradingView, ex.: BTCUSDT.P")
    side: Literal["long", "short"]
    price: float = Field(..., gt=0, description="Preço no momento do alerta")

    # POCs que compõem a zona onde o preço está — as entradas espalham-se por estes.
    zone_pocs: list[float] = Field(default_factory=list)
    # POCs acima do preço, ordenados do mais próximo ao mais distante.
    targets_up: list[float] = Field(default_factory=list)
    # POCs abaixo do preço, ordenados do mais próximo ao mais distante.
    targets_down: list[float] = Field(default_factory=list)
    # Nível cujo fecho de vela para lá dele invalida o setup (stop efetivo).
    zone_break: float = Field(..., gt=0)

    # Opcional: segredo partilhado para autenticar o webhook.
    secret: str | None = None

    @field_validator("zone_pocs", "targets_up", "targets_down")
    @classmethod
    def _positive_levels(cls, v: list[float]) -> list[float]:
        return [x for x in v if x is not None and x > 0]

    def symbol_base(self) -> str:
        """BTCUSDT.P -> BTC (remove sufixos de perpétuo e a quote)."""
        t = self.ticker.upper().replace(".P", "").replace("PERP", "")
        for suffix in ("USDT", "USD"):
            if t.endswith(suffix):
                return t[: -len(suffix)]
        return t
