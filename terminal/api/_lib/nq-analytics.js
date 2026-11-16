// Pure builders: parsed chain (+ optional NQ futures / VIX inputs) -> the JSON
// the terminal renders. No I/O here so it can be unit-tested on a fixture.

import {
  charmFlow,
  charmFlowByStrike,
  dexByStrike,
  gexByStrike,
  gexProfile,
  heatmap,
  maxPain,
  nearest,
  putCallRatio,
  topStrikes,
  totalDex,
  totalGex,
  vannaFlow,
  vannaFlowByStrike,
  walls,
  zeroGammaCrossings,
} from './exposure.js'
import { round } from './http.js'

export const QQQ_MULT = 100
const EXPOSURE_MAX_DTE = 21
const DAY_YEARS = 1 / 365.25

const regimeLabel = (gexB) => (gexB < 0 ? 'Negativo (maior volatilidade)' : 'Positivo (regime de pin/baixa volatilidade)')

export function vixReading(v) {
  if (v == null) return null
  if (v < 15) return 'Baixo/Complacente'
  if (v < 20) return 'Normal'
  if (v < 30) return 'Elevado/Cauteloso'
  return 'Stress/Pânico'
}

// NQ/QQQ ratio taken at the same instant: the QQQ quote is ~15 min delayed, so
// pairing it with the latest futures print would bake the last 15 minutes of
// movement into the ratio. Uses the futures candle covering the quote time.
export function alignedRatio(qqqSpot, quoteTimeMs, nqCandles) {
  if (!qqqSpot || !nqCandles?.length) return null
  let px = null
  if (quoteTimeMs) {
    const t = quoteTimeMs / 1000
    for (let i = nqCandles.length - 1; i >= 0; i--) {
      if (nqCandles[i].time <= t) {
        const c = nqCandles[i]
        const next = nqCandles[i + 1]
        const span = next ? next.time - c.time : 300
        px = t - c.time > span / 2 ? c.close : c.open
        break
      }
    }
  }
  px ??= nqCandles[nqCandles.length - 1].close
  const ratio = px / qqqSpot
  return ratio > 30 && ratio < 55 ? ratio : null
}

function exposureRows(rows) {
  return rows.filter((r) => r.iv > 0.01 && r.oi > 0 && r.dte >= 0 && r.dte <= EXPOSURE_MAX_DTE)
}

// Contracts of the first expiry still alive, if it expires within 24h.
function zeroDteRows(rows) {
  let first = null
  for (const r of rows) if (!first || r.T < first.T) first = r
  if (!first || first.T > DAY_YEARS) return { expiry: null, rows: [] }
  return { expiry: first.expiry, rows: rows.filter((r) => r.expiry === first.expiry) }
}

function atmOf(rows, spot) {
  let strike = null
  for (const r of rows) if (strike == null || Math.abs(r.strike - spot) < Math.abs(strike - spot)) strike = r.strike
  if (strike == null) return null
  const at = rows.filter((r) => r.strike === strike)
  const ivs = at.map((r) => r.iv).filter((v) => v > 0)
  const call = at.find((r) => r.cp === 'C')
  const put = at.find((r) => r.cp === 'P')
  return {
    strike,
    iv: ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null,
    straddle: call?.mid > 0 && put?.mid > 0 ? call.mid + put.mid : null,
  }
}

function groupByExpiry(rows) {
  const map = new Map()
  for (const r of rows) {
    let g = map.get(r.expiry)
    if (!g) map.set(r.expiry, (g = []))
    g.push(r)
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

// IV of the contract whose vendor delta is closest to the target.
function ivAtDelta(rows, cp, target) {
  let best = null
  for (const r of rows) {
    if (r.cp !== cp || r.delta == null || r.oi <= 0) continue
    const d = Math.abs(r.delta - target)
    if (!best || d < best.d) best = { d, iv: r.iv }
  }
  return best && best.d < 0.08 ? best.iv : null
}

function expectedMoves(byExpiry, spot) {
  const picks = []
  const first = byExpiry[0]
  if (first) picks.push(first)
  const weekly = byExpiry.find(([exp, g]) => new Date(`${exp}T12:00:00Z`).getUTCDay() === 5 && g[0].dte >= 1)
  if (weekly && weekly !== first) picks.push(weekly)
  const monthly = byExpiry.find(([, g]) => g[0].dte >= 25)
  if (monthly && !picks.includes(monthly)) picks.push(monthly)
  const out = []
  for (const [expiry, g] of picks) {
    const atm = atmOf(g, spot)
    if (!atm?.iv) continue
    const sigmaMove = spot * atm.iv * Math.sqrt(g[0].T)
    out.push({
      expiry,
      dte: g[0].dte,
      atm_iv: round(atm.iv * 100, 2),
      straddle: round(atm.straddle, 2),
      sigma_move: round(sigmaMove, 2),
      upper: round(spot + sigmaMove, 2),
      lower: round(spot - sigmaMove, 2),
    })
  }
  return out
}

function volumeByStrike(rows, spot, pctBand = 0.08, n = 12) {
  const lo = spot * (1 - pctBand)
  const hi = spot * (1 + pctBand)
  const agg = new Map()
  for (const r of rows) {
    if (!r.volume || r.strike < lo || r.strike > hi) continue
    let a = agg.get(r.strike)
    if (!a) agg.set(r.strike, (a = { strike: r.strike, calls: 0, puts: 0 }))
    if (r.cp === 'C') a.calls += r.volume
    else a.puts += r.volume
  }
  return [...agg.values()]
    .sort((a, b) => b.calls + b.puts - (a.calls + a.puts))
    .slice(0, n)
    .sort((a, b) => a.strike - b.strike)
}

function premiumTraded(rows) {
  let calls = 0
  let puts = 0
  for (const r of rows) {
    const p = (r.volume ?? 0) * (r.mid ?? 0) * QQQ_MULT
    if (r.cp === 'C') calls += p
    else puts += p
  }
  return { calls: round(calls, 0), puts: round(puts, 0) }
}

const ladder = (agg, n) =>
  topStrikes(agg, n)
    .sort((a, b) => a.strike - b.strike)
    .map((s) => ({ strike: s.strike, gex: round(s.value, 0) }))

export function buildCore(chain, { nqCandles = null, nqLast = null, vix = null, nowMs = Date.now() } = {}) {
  const spotDelayed = chain.spot
  const ratio = alignedRatio(spotDelayed, chain.quoteTimeMs, nqCandles)
  const nqPrice = nqLast ?? (nqCandles?.length ? nqCandles[nqCandles.length - 1].close : null)
  // Where QQQ would be now given where the futures are: lets the levels stay
  // meaningful overnight, when the chain is frozen but NQ keeps trading.
  const spotLive = ratio && nqPrice ? nqPrice / ratio : null
  const spot = spotLive ?? spotDelayed

  const rows = exposureRows(chain.rows)
  const toNq = (qqq) => (ratio && qqq != null ? Math.round(qqq * ratio) : null)
  const ref = (qqq) => (qqq == null ? null : `${qqq.toFixed(1)} QQQ${ratio ? ` (~${Math.round(qqq * ratio).toLocaleString('en-US')} NQ)` : ''}`)

  const gexAgg = gexByStrike(rows, spot, QQQ_MULT)
  const { call: callWall, put: putWall } = walls(gexAgg)
  const gexTotal = totalGex(rows, spot, QQQ_MULT)
  const gexTotalB = round(gexTotal / 1e9, 3)

  const fine = gexProfile(rows, spot, QQQ_MULT, { loPct: 0.88, hiPct: 1.12, steps: 240 })
  let flips = zeroGammaCrossings(fine)
  if (!flips.length) flips = zeroGammaCrossings(gexProfile(rows, spot, QQQ_MULT))
  const zeroGamma = nearest(flips, spot)

  const zd = zeroDteRows(rows)
  let zeroDte = null
  if (zd.rows.length) {
    const agg = gexByStrike(zd.rows, spot, QQQ_MULT)
    const w = walls(agg)
    const wall = topStrikes(agg, 1)[0] ?? null
    const vol = putCallRatio(zd.rows, 'volume')
    zeroDte = {
      expiry: zd.expiry,
      gex_total_b: round(totalGex(zd.rows, spot, QQQ_MULT) / 1e9, 3),
      gamma_wall_qqq: wall?.strike ?? null,
      gamma_wall: toNq(wall?.strike),
      gamma_wall_gex: round(wall?.value, 0),
      call_resistance_qqq: w.call && w.call.value > 0 ? w.call.strike : null,
      put_support_qqq: w.put && w.put.value < 0 ? w.put.strike : null,
      volume_calls: vol.calls,
      volume_puts: vol.puts,
      strikes: ladder(agg, 10),
    }
  }

  const byExpiry = groupByExpiry(chain.rows)
  const nearestExpiryRows = byExpiry[0]?.[1] ?? []
  const pcrOi = putCallRatio(nearestExpiryRows, 'oi')
  const pcrVol = putCallRatio(chain.rows, 'volume')

  const level = {
    asset: 'NQ',
    as_of_utc: new Date(nowMs).toISOString().slice(0, 19) + 'Z',
    price: nqPrice != null ? round(nqPrice, 2) : toNq(spot),
    price_ref: `QQQ ${spot.toFixed(2)}`,
    price_qqq: round(spot, 2),
    gex_total_b: gexTotalB,
    gex_regime: regimeLabel(gexTotalB),
    dex_total_b: round(totalDex(rows, spot, QQQ_MULT) / 1e9, 2),
    call_wall: toNq(callWall?.strike),
    call_wall_ref: ref(callWall?.strike),
    call_wall_qqq: callWall?.strike ?? null,
    put_wall: toNq(putWall?.strike),
    put_wall_ref: ref(putWall?.strike),
    put_wall_qqq: putWall?.strike ?? null,
    zero_gamma: toNq(zeroGamma),
    zero_gamma_ref: ref(zeroGamma),
    zero_gamma_qqq: round(zeroGamma, 1),
    dte0_dominant: zeroDte?.gamma_wall ?? null,
    dte0_dominant_ref: zeroDte ? ref(zeroDte.gamma_wall_qqq) : 'Sem expiração nas próximas 24h',
    vix: vix?.value ?? null,
    vix_change_pct: vix?.changePct ?? null,
    vix_reading: vixReading(vix?.value),
  }

  return {
    level,
    meta: {
      ratio: round(ratio, 4),
      spot_qqq_delayed: round(spotDelayed, 2),
      spot_basis: spotLive ? 'futuros' : 'cboe_delayed',
      quote_time_utc: chain.quoteTimeMs ? new Date(chain.quoteTimeMs).toISOString() : null,
      contracts: rows.length,
      prev_close_qqq: chain.prevClose,
      iv30: chain.iv30,
      iv30_change: chain.iv30Change,
    },
    gex_strikes: ladder(gexAgg, 14),
    dex_strikes: ladder(dexByStrike(rows, spot, QQQ_MULT), 14),
    vanna_strikes: ladder(vannaFlowByStrike(rows, spot, QQQ_MULT), 14),
    charm_strikes: ladder(charmFlowByStrike(rows, spot, QQQ_MULT), 14),
    flows: {
      vanna_per_volpt_b: round(vannaFlow(rows, spot, QQQ_MULT) / 1e9, 3),
      charm_per_day_b: round(charmFlow(rows, spot, QQQ_MULT) / 1e9, 3),
    },
    profile: gexProfile(rows, spot, QQQ_MULT, { loPct: 0.92, hiPct: 1.08, steps: 80 }).map((p) => [round(p.spot, 2), round(p.gex / 1e9, 4)]),
    zero_gammas_qqq: flips.map((f) => round(f, 1)),
    zero_dte: zeroDte,
    expected_moves: expectedMoves(byExpiry, spot),
    max_pain_qqq: maxPain(nearestExpiryRows.filter((r) => r.oi > 0)),
    max_pain_expiry: byExpiry[0]?.[0] ?? null,
    pcr_oi: round(pcrOi.ratio, 2),
    pcr_volume: round(pcrVol.ratio, 2),
    volume_total: { calls: pcrVol.calls, puts: pcrVol.puts },
    premium_traded: premiumTraded(chain.rows),
    volume_strikes: volumeByStrike(chain.rows, spot),
  }
}

export function buildVol(chain) {
  const spot = chain.spot
  const byExpiry = groupByExpiry(chain.rows)

  const term = []
  for (const [expiry, g] of byExpiry.slice(0, 25)) {
    const atm = atmOf(g, spot)
    if (!atm?.iv) continue
    const c25 = ivAtDelta(g, 'C', 0.25)
    const p25 = ivAtDelta(g, 'P', -0.25)
    term.push({
      expiry,
      dte: g[0].dte,
      atm_iv: round(atm.iv * 100, 2),
      rr25: c25 != null && p25 != null ? round((c25 - p25) * 100, 2) : null,
    })
  }

  const skewGroup = byExpiry.find(([, g]) => g[0].dte > 0)
  const skewRows = []
  if (skewGroup) {
    for (const r of skewGroup[1]) {
      if (r.oi < 50 || r.strike < spot * 0.9 || r.strike > spot * 1.1) continue
      // in-the-money quotes are wide and their IV noisy; the OTM side is the liquid one
      if (r.strike <= spot ? r.cp !== 'P' : r.cp !== 'C') continue
      skewRows.push({ strike: r.strike, moneyness_pct: round((r.strike / spot - 1) * 100, 2), iv: round(r.iv * 100, 2), cp: r.cp })
    }
    skewRows.sort((a, b) => a.strike - b.strike)
  }

  // OTM side only (puts below spot, calls above): one smooth sheet instead of
  // overlapping call/put surfaces.
  // an expiry in its last hours has wing IVs in the hundreds of percent, which flattens every other expiry on the z axis
  const surfaceExpiries = byExpiry.filter(([, g]) => g[0].T > 1 / 365).slice(0, 8)
  const surfaceRows = []
  for (const [expiry, g] of surfaceExpiries) {
    const byStrike = new Map()
    for (const r of g) {
      if (r.oi < 30 || r.strike < spot * 0.92 || r.strike > spot * 1.08) continue
      const otm = r.strike <= spot ? r.cp === 'P' : r.cp === 'C'
      if (otm) byStrike.set(r.strike, r.iv * 100)
    }
    for (const [strike, iv] of [...byStrike.entries()].sort((a, b) => a[0] - b[0])) {
      surfaceRows.push({ expiry, dte: g[0].dte, strike, moneyness_pct: round((strike / spot - 1) * 100, 2), iv: round(iv, 2) })
    }
  }

  const heatExpiries = byExpiry.filter(([, g]) => g[0].dte <= 30).slice(0, 6).map(([e]) => e)
  const heatRows = heatmap(
    chain.rows.filter((r) => r.iv > 0.01 && r.oi > 0),
    spot,
    QQQ_MULT,
    { expiries: heatExpiries, pctBand: 0.07 },
  ).map((r) => ({ ...r, gex: round(r.gex, 0) }))

  return {
    as_of_utc: new Date().toISOString().slice(0, 19) + 'Z',
    heatmap: { spot, expiries: heatExpiries, rows: heatRows },
    iv_term: { spot, rows: term },
    iv_skew: { spot, expiry: skewGroup?.[0] ?? null, rows: skewRows },
    iv_surface: { spot, expiries: surfaceExpiries.map(([expiry, g]) => ({ expiry, dte: g[0].dte })), rows: surfaceRows },
  }
}
