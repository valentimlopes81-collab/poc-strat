"""Motor de estratégia: converte um alerta em plano de trade determinístico.

A partir dos níveis de POC recebidos no webhook produz:
  - ordens limite espalhadas pelos POCs da zona (entrada a preço médio);
  - alvos TP1/TP2/TP3 nas próximas zonas de POC, ignorando as demasiado próximas;
  - o stop efetivo (zone_break), usado tanto para sizing como para o corte.

Tudo aqui é função pura — não toca em rede nem em base de dados — para ser
testável e reproduzível.
"""
from __future__ import annotations

from dataclasses import dataclass

from .config import Settings, settings as default_settings
from .schemas import AlertPayload


@dataclass
class EntryOrder:
    price: float
    qty: float  # quantidade em unidades do ativo (contratos/coin)


@dataclass
class TakeProfit:
    price: float
    close_fraction: float  # fração da posição a fechar neste alvo (soma ~1.0)


@dataclass
class TradePlan:
    side: str  # "long" | "short"
    entries: list[EntryOrder]
    targets: list[TakeProfit]
    stop: float
    planned_avg_entry: float
    total_qty: float
    risk_usd: float

    @property
    def notional(self) -> float:
        return self.total_qty * self.planned_avg_entry


def _mean(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _select_targets(
    planned_avg: float, candidates: list[float], side: str, s: Settings
) -> list[float]:
    """Ordena os candidatos na direção do lucro e filtra os que estão a menos
    de ``min_target_dist_pct`` do preço médio de entrada."""
    if planned_avg <= 0:
        return []
    valid = []
    for lvl in candidates:
        dist_pct = abs(lvl - planned_avg) / planned_avg * 100.0
        if dist_pct < s.min_target_dist_pct:
            continue
        # Só alvos na direção correta (acima p/ long, abaixo p/ short).
        if side == "long" and lvl <= planned_avg:
            continue
        if side == "short" and lvl >= planned_avg:
            continue
        valid.append(lvl)
    # Do mais próximo ao mais distante na direção do lucro.
    valid.sort(reverse=(side == "short"))
    return valid[:3]


def _tp_fractions(n: int, s: Settings) -> list[float]:
    """Distribui o fecho da posição pelos alvos disponíveis (renormaliza se
    houver menos de 3 zonas válidas)."""
    if n <= 0:
        return []
    base = list(s.tp_split[:n])
    total = sum(base)
    return [f / total for f in base]


def build_plan(payload: AlertPayload, s: Settings | None = None) -> TradePlan | None:
    """Constrói o plano de trade a partir do alerta. Devolve ``None`` se os
    dados forem incoerentes (ex.: stop do lado errado do preço)."""
    s = s or default_settings

    # POCs da zona onde vamos espalhar as entradas. Sem zona, usa o preço.
    zone = sorted(set(payload.zone_pocs)) or [payload.price]
    zone = zone[: s.max_entry_orders]
    planned_avg = _mean(zone)
    if planned_avg <= 0:
        return None

    # O zone_break é o stop efetivo. Tem de estar do lado certo do preço médio.
    stop = payload.zone_break
    if payload.side == "long":
        stop_dist = planned_avg - stop
    else:
        stop_dist = stop - planned_avg
    if stop_dist <= 0:
        # Stop do lado errado -> setup inválido, não arriscamos sizing absurdo.
        return None

    # Sizing por risco: se o preço fechar além da zona, a perda é ~risk_usd.
    risk_usd = s.account_start_usd * s.risk_pct
    total_qty = risk_usd / stop_dist

    # Distribui a quantidade igualmente pelas ordens limite (uma por POC).
    per_order = total_qty / len(zone)
    entries = [EntryOrder(price=p, qty=per_order) for p in zone]

    # Alvos: próximas zonas na direção do lucro, filtradas por distância mínima.
    raw_targets = payload.targets_up if payload.side == "long" else payload.targets_down
    tgt_levels = _select_targets(planned_avg, raw_targets, payload.side, s)
    fracs = _tp_fractions(len(tgt_levels), s)
    targets = [TakeProfit(price=lvl, close_fraction=f) for lvl, f in zip(tgt_levels, fracs)]

    return TradePlan(
        side=payload.side,
        entries=entries,
        targets=targets,
        stop=stop,
        planned_avg_entry=planned_avg,
        total_qty=total_qty,
        risk_usd=risk_usd,
    )
