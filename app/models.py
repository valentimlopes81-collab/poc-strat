"""Modelo de dados persistido (SQLite via SQLModel)."""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    # UTC naive: o SQLite não preserva tzinfo no roundtrip, por isso mantemos
    # tudo naive para as comparações de datas serem consistentes.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class TradeStatus(str, Enum):
    pending = "pending"      # limits colocados, nada preenchido ainda
    open = "open"            # pelo menos uma entrada preenchida
    closed = "closed"        # fechado (TPs, break, ou manual)
    cancelled = "cancelled"  # expirou sem qualquer fill


class CloseReason(str, Enum):
    take_profit = "take_profit"
    zone_break = "zone_break"
    manual = "manual"
    expired = "expired"


class Trade(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)          # ex.: BTC/USDT:USDT
    ticker_raw: str                          # como veio do TradingView
    side: str                                # long | short
    status: TradeStatus = Field(default=TradeStatus.pending, index=True)

    planned_avg_entry: float
    stop: float
    risk_usd: float
    total_qty: float                         # quantidade planeada (todos os limits)

    filled_qty: float = 0.0
    avg_entry: float = 0.0                    # preço médio das entradas preenchidas
    remaining_qty: float = 0.0                # posição ainda aberta
    realized_pnl: float = 0.0
    last_price: float = 0.0                   # último preço visto (para PnL live)

    created_at: datetime = Field(default_factory=utcnow)
    opened_at: datetime | None = None
    closed_at: datetime | None = None
    close_reason: CloseReason | None = None
    expires_at: datetime | None = None        # TTL das entradas por encher


class EntryOrder(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    trade_id: int = Field(foreign_key="trade.id", index=True)
    price: float
    qty: float
    filled: bool = False
    filled_at: datetime | None = None


class Target(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    trade_id: int = Field(foreign_key="trade.id", index=True)
    rank: int                                 # 1, 2, 3 -> TP1/TP2/TP3
    price: float
    close_fraction: float
    hit: bool = False
    hit_at: datetime | None = None
