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


def _entry_cluster(price: float, levels: list[float], side_up: bool, s: Settings) -> list[float]:
    """POCs do lado da entrada (resistência acima p/ short, suporte abaixo p/ long)
    que estão ao alcance (``entry_reach_pct``), ordenados do mais próximo do preço
    para o mais distante, limitados a ``max_entry_orders``."""
    out: list[float] = []
    for lvl in levels:
        if side_up and lvl > price:
            dist = (lvl - price) / price * 100.0
        elif (not side_up) and lvl < price:
            dist = (price - lvl) / price * 100.0
        else:
            continue
        if dist <= s.entry_reach_pct:
            out.append(lvl)
    # Nearest-first: acima -> ascendente; abaixo -> descendente.
    out.sort(reverse=not side_up)
    return out[: s.max_entry_orders]


def _compute_stop(side: str, entries: list[float], below: list[float], above: list[float], s: Settings) -> float:
    """Stop = logo para lá do cluster de entrada ('rompeu a zona'), encaixando
    no POC seguinte se ele estiver dentro de ``max_stop_pct``; caso contrário
    corta nesse limite, para o risco não ficar excessivo com POCs espaçados."""
    if side == "long":
        low = min(entries)
        cap = low * (1 - s.max_stop_pct / 100.0)
        # POC de suporte logo abaixo do cluster, mas não mais longe que o limite
        near = [l for l in below if cap <= l < low]
        return max(near) if near else cap
    high = max(entries)
    cap = high * (1 + s.max_stop_pct / 100.0)
    near = [l for l in above if high < l <= cap]
    return min(near) if near else cap


def _select_targets(
    ref: float, candidates: list[float], side: str, s: Settings
) -> list[float]:
    """Alvos no lado oposto à entrada, filtrando os que estão a menos de
    ``min_target_dist_pct`` da entrada média, do mais próximo ao mais distante."""
    if ref <= 0:
        return []
    valid = []
    for lvl in candidates:
        dist_pct = abs(lvl - ref) / ref * 100.0
        if dist_pct < s.min_target_dist_pct:
            continue
        if side == "long" and lvl <= ref:
            continue
        if side == "short" and lvl >= ref:
            continue
        valid.append(lvl)
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
    """Constrói o plano de trade a partir do alerta.

    Entradas = POCs naked do lado da aproximação (suporte abaixo p/ long,
    resistência acima p/ short) ao alcance. Alvos = POCs naked do lado oposto.
    Stop = para lá do cluster de entrada. Devolve ``None`` se não houver uma
    zona de entrada válida (evita entrar a mercado sem POCs de suporte)."""
    s = s or default_settings
    price = payload.price
    if price <= 0:
        return None

    below = sorted(set(payload.targets_down), reverse=True)
    above = sorted(set(payload.targets_up))

    if payload.side == "long":
        entry_levels = _entry_cluster(price, below, side_up=False, s=s)  # suportes abaixo
        target_pool = above
    else:
        entry_levels = _entry_cluster(price, above, side_up=True, s=s)   # resistências acima
        target_pool = below

    if not entry_levels:
        # Sem POCs do lado da entrada ao alcance -> não há setup real. Salta.
        return None

    planned_avg = _mean(entry_levels)
    stop = _compute_stop(payload.side, entry_levels, below, above, s)

    stop_dist = (stop - planned_avg) if payload.side == "short" else (planned_avg - stop)
    if stop_dist <= 0:
        return None

    # Sizing por risco: se o preço fechar além da zona, a perda é ~risk_usd.
    risk_usd = s.account_start_usd * s.risk_pct
    total_qty = risk_usd / stop_dist

    per_order = total_qty / len(entry_levels)
    entries = [EntryOrder(price=p, qty=per_order) for p in entry_levels]

    tgt_levels = _select_targets(planned_avg, target_pool, payload.side, s)
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
