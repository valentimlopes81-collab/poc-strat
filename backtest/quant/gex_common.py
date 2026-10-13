"""Funcoes partilhadas para calculo de Gamma Exposure (GEX) aproximado.

Metodologia publica standard (a mesma usada pela maioria das ferramentas
gratuitas de GEX, nao e segredo proprietario):
  gamma (Black-Scholes) = phi(d1) / (S * sigma * sqrt(T))
  GEX por strike = (gamma_call * OI_call - gamma_put * OI_put) * S^2 * 0.01 * multiplier

Convencao de sinal standard: GEX total positivo => dealers tendencialmente
long gamma => hedging amortece volatilidade (compram quedas, vendem subidas)
=> regime de "pin"/baixa vol. GEX negativo => dealers short gamma => hedging
amplifica movimento => regime de maior volatilidade.

Isto e uma APROXIMACAO publica, nao o produto exato de um vendor pago
(que tem fluxo intradiario e assunções proprietárias adicionais).
"""
import math


def norm_pdf(x):
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


MIN_T_YEARS = 2.0 / 24.0 / 365.0  # piso de 2h — evita a divergencia matematica do
# gamma Black-Scholes quando T->0 perto da expiracao (limitacao conhecida da formula,
# nao corrigida pela maioria das implementacoes publicas de GEX sem este piso)


def bs_gamma(S, K, T, sigma, r=0.04):
    T = max(T, MIN_T_YEARS)
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return 0.0
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
    return norm_pdf(d1) / (S * sigma * math.sqrt(T))


def total_gex_at_spot(rows, spot, multiplier=1.0):
    """rows: list of dicts with keys strike, T, iv, oi, cp ('C'/'P')."""
    total = 0.0
    for r in rows:
        g = bs_gamma(spot, r["strike"], r["T"], r["iv"])
        sign = 1.0 if r["cp"] == "C" else -1.0
        total += sign * g * r["oi"]
    return total * spot * spot * 0.01 * multiplier


def find_zero_gamma(rows, spot, multiplier=1.0, lo_pct=0.7, hi_pct=1.3, steps=120):
    """Varre precos hipoteticos e encontra onde o GEX total muda de sinal."""
    lo, hi = spot * lo_pct, spot * hi_pct
    prev_s, prev_v = None, None
    crossings = []
    for i in range(steps + 1):
        s = lo + (hi - lo) * i / steps
        v = total_gex_at_spot(rows, s, multiplier)
        if prev_v is not None and (prev_v < 0) != (v < 0):
            # interpolacao linear simples para o ponto de cruzamento
            frac = abs(prev_v) / (abs(prev_v) + abs(v)) if (prev_v - v) != 0 else 0.5
            crossing = prev_s + (s - prev_s) * frac
            crossings.append(crossing)
        prev_s, prev_v = s, v
    return crossings


def strikes_by_abs_gex(rows, spot, multiplier=1.0, top_n=8):
    agg = {}
    for r in rows:
        g = bs_gamma(spot, r["strike"], r["T"], r["iv"])
        sign = 1.0 if r["cp"] == "C" else -1.0
        val = sign * g * r["oi"] * spot * spot * 0.01 * multiplier
        agg[r["strike"]] = agg.get(r["strike"], 0.0) + val
    return sorted(agg.items(), key=lambda kv: -abs(kv[1]))[:top_n]


def call_put_walls(rows, spot, multiplier=1.0):
    """Devolve (call_wall, put_wall) — o strike com maior GEX positivo (call-heavy)
    e o strike com maior |GEX| negativo (put-heavy), cada um como (strike, valor)."""
    agg = {}
    for r in rows:
        g = bs_gamma(spot, r["strike"], r["T"], r["iv"])
        sign = 1.0 if r["cp"] == "C" else -1.0
        val = sign * g * r["oi"] * spot * spot * 0.01 * multiplier
        agg[r["strike"]] = agg.get(r["strike"], 0.0) + val
    call_wall = max(agg.items(), key=lambda kv: kv[1], default=None)
    put_wall = min(agg.items(), key=lambda kv: kv[1], default=None)
    return call_wall, put_wall
