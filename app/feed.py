"""Feed de preços da Bybit (perpétuos USDT) via ccxt.

Para cada símbolo devolve um MarketTick com o máximo/mínimo da vela viva (para
detetar fills, incluindo wicks) e o fecho da última vela confirmada (para o
critério de corte por zone_break).
"""
from __future__ import annotations

import ccxt

from .config import Settings, settings as default_settings
from .engine import MarketTick


def make_exchange(s: Settings | None = None) -> ccxt.Exchange:
    s = s or default_settings
    klass = getattr(ccxt, s.exchange_id)
    ex = klass({"enableRateLimit": True, "options": {"defaultType": "swap"}})
    return ex


def get_ticks(ex: ccxt.Exchange, symbols: list[str], s: Settings | None = None) -> dict[str, MarketTick]:
    s = s or default_settings
    out: dict[str, MarketTick] = {}
    for sym in symbols:
        try:
            bars = ex.fetch_ohlcv(sym, timeframe=s.break_timeframe, limit=2)
            if not bars:
                continue
            live = bars[-1]
            confirmed = bars[-2] if len(bars) >= 2 else bars[-1]
            # OHLCV = [ts, open, high, low, close, volume]
            out[sym] = MarketTick(
                symbol=sym,
                last=float(live[4]),
                bar_high=float(live[2]),
                bar_low=float(live[3]),
                bar_close=float(confirmed[4]),
            )
        except Exception:
            # Símbolo inválido / falha de rede: ignora este ciclo para este símbolo.
            continue
    return out
