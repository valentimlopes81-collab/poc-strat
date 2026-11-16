"""Funcoes partilhadas para calculo de Gamma Exposure (GEX) e Delta Exposure
(DEX) aproximados.

Metodologia publica standard (a mesma usada pela maioria das ferramentas
gratuitas de GEX, nao e segredo proprietario):
  gamma (Black-Scholes) = phi(d1) / (S * sigma * sqrt(T))
  GEX por strike = (gamma_call * OI_call - gamma_put * OI_put) * S^2 * 0.01 * multiplier

Convencao de sinal standard: GEX total positivo => dealers tendencialmente
long gamma => hedging amortece volatilidade (compram quedas, vendem subidas)
=> regime de "pin"/baixa vol. GEX negativo => dealers short gamma => hedging
amplifica movimento => regime de maior volatilidade.

DEX (Delta Exposure) por strike = (delta_call * OI_call + delta_put * OI_put)
* S * multiplier -- SEM flip de sinal artificial, porque o delta ja vem com
sinal natural (call em [0,1], put em [-1,0]). Mede se o open interest total
pende para o lado "call" (DEX positivo) ou "put" (DEX negativo), em dolares
equivalentes de exposicao ao subjacente -- e um proxy do skew direcional do
OI, NAO uma certeza sobre de que lado os dealers estao (tal como o GEX, e
so o OI, nao fluxo real).

Vanna e charm (fluxo de hedge estimado dos dealers, mesma convencao de
sinal do GEX: long calls / short puts):
  vanna = dDelta/dSigma = -phi(d1) * d2 / sigma      (igual para call e put)
  charm = dDelta/dt     = -phi(d1) * (2rT - d2*sigma*sqrt(T)) / (2T*sigma*sqrt(T))
  vanna_flow = soma(sinal * vanna * OI) * 0.01 * S * mult   -> $ que os dealers
               compram (>0) ou vendem (<0) se a IV cair 1 ponto
  charm_flow = -soma(sinal * charm * OI) / 365 * S * mult   -> idem, por cada
               dia que passa com preco e vol parados

Isto e uma APROXIMACAO publica, nao o produto exato de um vendor pago
(que tem fluxo intradiario e assunções proprietárias adicionais).

A mesma matematica esta em terminal/api/_lib (JavaScript), que e o que o
site usa ao vivo; os testes dos dois lados fixam os mesmos valores de
referencia para nao divergirem.
"""
import datetime
import math
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")


def expiry_close_utc(expiration):
    """Opcoes de acoes/ETF dos EUA deixam de negociar as 16:00 de Nova Iorque
    no dia da expiracao: 21:00 UTC no inverno, 20:00 UTC no verao. Devolve um
    datetime naive em UTC (para comparar com datetime.utcnow())."""
    close = datetime.datetime.combine(expiration, datetime.time(16, 0), tzinfo=NY)
    return close.astimezone(datetime.timezone.utc).replace(tzinfo=None)


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


def bs_delta(S, K, T, sigma, cp, r=0.04):
    T = max(T, MIN_T_YEARS)
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return 0.0
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
    n_d1 = 0.5 * (1.0 + math.erf(d1 / math.sqrt(2)))
    return n_d1 if cp == "C" else n_d1 - 1.0


def _d1_d2(S, K, T, sigma, r):
    sqrt_t = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrt_t)
    return d1, d1 - sigma * sqrt_t, sqrt_t


def bs_vanna(S, K, T, sigma, r=0.04):
    """dDelta/dSigma por 1.00 de vol. Igual para calls e puts."""
    T = max(T, MIN_T_YEARS)
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return 0.0
    d1, d2, _ = _d1_d2(S, K, T, sigma, r)
    return -norm_pdf(d1) * d2 / sigma


def bs_charm(S, K, T, sigma, r=0.04):
    """dDelta/dt por ANO de tempo de calendario (sem dividendos, igual para
    calls e puts). Dividir por 365 para o valor por dia."""
    T = max(T, MIN_T_YEARS)
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return 0.0
    d1, d2, sqrt_t = _d1_d2(S, K, T, sigma, r)
    return -norm_pdf(d1) * (2 * r * T - d2 * sigma * sqrt_t) / (2 * T * sigma * sqrt_t)


def vanna_flow(rows, spot, multiplier=1.0):
    """$ de subjacente que os dealers compram (>0) se a IV cair 1 ponto."""
    total = 0.0
    for r in rows:
        sign = 1.0 if r["cp"] == "C" else -1.0
        total += sign * bs_vanna(spot, r["strike"], r["T"], r["iv"]) * r["oi"]
    return total * 0.01 * spot * multiplier


def charm_flow(rows, spot, multiplier=1.0):
    """$ de subjacente que os dealers compram (>0) por cada dia que passa."""
    total = 0.0
    for r in rows:
        sign = 1.0 if r["cp"] == "C" else -1.0
        total += sign * bs_charm(spot, r["strike"], r["T"], r["iv"]) * r["oi"]
    return -total / 365.0 * spot * multiplier


def total_dex_at_spot(rows, spot, multiplier=1.0):
    """rows: list of dicts with keys strike, T, iv, oi, cp ('C'/'P'). Sem
    flip de sinal -- o delta ja e positivo para calls, negativo para puts."""
    total = 0.0
    for r in rows:
        d = bs_delta(spot, r["strike"], r["T"], r["iv"], r["cp"])
        total += d * r["oi"]
    return total * spot * multiplier


def dex_by_strike(rows, spot, multiplier=1.0, top_n=8):
    agg = {}
    for r in rows:
        d = bs_delta(spot, r["strike"], r["T"], r["iv"], r["cp"])
        val = d * r["oi"] * spot * multiplier
        agg[r["strike"]] = agg.get(r["strike"], 0.0) + val
    return sorted(agg.items(), key=lambda kv: -abs(kv[1]))[:top_n]


def total_gex_at_spot(rows, spot, multiplier=1.0):
    """rows: list of dicts with keys strike, T, iv, oi, cp ('C'/'P')."""
    total = 0.0
    for r in rows:
        g = bs_gamma(spot, r["strike"], r["T"], r["iv"])
        sign = 1.0 if r["cp"] == "C" else -1.0
        total += sign * g * r["oi"]
    return total * spot * spot * 0.01 * multiplier


def _crossings(rows, spot, multiplier, lo_pct, hi_pct, steps):
    lo, hi = spot * lo_pct, spot * hi_pct
    prev_s, prev_v = None, None
    crossings = []
    for i in range(steps + 1):
        s = lo + (hi - lo) * i / steps
        v = total_gex_at_spot(rows, s, multiplier)
        if prev_v is not None and (prev_v < 0) != (v < 0):
            # interpolacao linear simples para o ponto de cruzamento
            frac = abs(prev_v) / (abs(prev_v) + abs(v)) if (prev_v - v) != 0 else 0.5
            crossings.append(prev_s + (s - prev_s) * frac)
        prev_s, prev_v = s, v
    return crossings


def find_zero_gamma(rows, spot, multiplier=1.0, lo_pct=0.88, hi_pct=1.12, steps=240):
    """Varre precos hipoteticos e encontra onde o GEX total muda de sinal.
    Passo de 0,1% do spot (antes 0,5%, que deixava o nivel oscilar ~2 pontos
    de QQQ so pela posicao da grelha). Se nao houver cruzamento a +/-12%,
    alarga a +/-30% com a grelha grossa."""
    found = _crossings(rows, spot, multiplier, lo_pct, hi_pct, steps)
    return found or _crossings(rows, spot, multiplier, 0.7, 1.3, 120)


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
