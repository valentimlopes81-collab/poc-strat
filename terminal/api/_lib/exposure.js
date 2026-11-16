// Exposure aggregates over an option chain. A "row" is
// { strike, T (years), iv (decimal), oi, cp: 'C'|'P', expiry: 'YYYY-MM-DD', volume?, mid?, delta? }.
//
// Sign convention for GEX / vanna / charm is the standard public one: dealers
// are assumed long calls and short puts (sign +1 for calls, -1 for puts). It
// is an approximation from open interest alone, not observed dealer flow.
// DEX uses the natural signed delta with no flip (see gex_common.py).

import { gamma, delta, vanna, charm } from './bs.js'

const sign = (r) => (r.cp === 'C' ? 1 : -1)

export function totalGex(rows, spot, mult = 1) {
  let total = 0
  for (const r of rows) total += sign(r) * gamma(spot, r.strike, r.T, r.iv) * r.oi
  return total * spot * spot * 0.01 * mult
}

export function totalDex(rows, spot, mult = 1) {
  let total = 0
  for (const r of rows) total += delta(spot, r.strike, r.T, r.iv, r.cp) * r.oi
  return total * spot * mult
}

// Dealer hedge flow, in $ of underlying, if implied vol falls by one vol point.
// Positive = dealers buy. (Dealer delta changes by -sign*OI*vanna*0.01, and
// they trade the opposite to stay hedged.)
export function vannaFlow(rows, spot, mult = 1) {
  let total = 0
  for (const r of rows) total += sign(r) * vanna(spot, r.strike, r.T, r.iv) * r.oi
  return total * 0.01 * spot * mult
}

// Dealer hedge flow, in $ of underlying, from one calendar day passing with
// spot and vol unchanged. Positive = dealers buy.
export function charmFlow(rows, spot, mult = 1) {
  let total = 0
  for (const r of rows) total += sign(r) * charm(spot, r.strike, r.T, r.iv) * r.oi
  return (-total / 365) * spot * mult
}

function byStrike(rows, valueOf) {
  const agg = new Map()
  for (const r of rows) agg.set(r.strike, (agg.get(r.strike) ?? 0) + valueOf(r))
  return agg
}

const topByAbs = (agg, n) =>
  [...agg.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, n)
    .map(([strike, value]) => ({ strike, value }))

export function gexByStrike(rows, spot, mult = 1) {
  const k = spot * spot * 0.01 * mult
  return byStrike(rows, (r) => sign(r) * gamma(spot, r.strike, r.T, r.iv) * r.oi * k)
}

export function dexByStrike(rows, spot, mult = 1) {
  return byStrike(rows, (r) => delta(spot, r.strike, r.T, r.iv, r.cp) * r.oi * spot * mult)
}

export function vannaFlowByStrike(rows, spot, mult = 1) {
  const k = 0.01 * spot * mult
  return byStrike(rows, (r) => sign(r) * vanna(spot, r.strike, r.T, r.iv) * r.oi * k)
}

export function charmFlowByStrike(rows, spot, mult = 1) {
  const k = (-1 / 365) * spot * mult
  return byStrike(rows, (r) => sign(r) * charm(spot, r.strike, r.T, r.iv) * r.oi * k)
}

export function topStrikes(agg, n = 10) {
  return topByAbs(agg, n)
}

// Strikes nearest to spot, for ladders that should read as a continuous
// price axis rather than a ranking.
export function strikesAround(agg, spot, n = 21) {
  return [...agg.entries()]
    .sort((a, b) => Math.abs(a[0] - spot) - Math.abs(b[0] - spot))
    .slice(0, n)
    .sort((a, b) => a[0] - b[0])
    .map(([strike, value]) => ({ strike, value }))
}

export function walls(agg) {
  let call = null
  let put = null
  for (const [strike, value] of agg) {
    if (!call || value > call.value) call = { strike, value }
    if (!put || value < put.value) put = { strike, value }
  }
  return { call, put }
}

// Total GEX as a function of a hypothetical spot. The sign changes are the
// zero-gamma ("flip") levels.
export function gexProfile(rows, spot, mult = 1, { loPct = 0.7, hiPct = 1.3, steps = 120 } = {}) {
  const lo = spot * loPct
  const hi = spot * hiPct
  const points = []
  for (let i = 0; i <= steps; i++) {
    const s = lo + ((hi - lo) * i) / steps
    points.push({ spot: s, gex: totalGex(rows, s, mult) })
  }
  return points
}

export function zeroGammaCrossings(profile) {
  const out = []
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1]
    const b = profile[i]
    if (a.gex < 0 !== b.gex < 0) {
      const denom = Math.abs(a.gex) + Math.abs(b.gex)
      const frac = denom ? Math.abs(a.gex) / denom : 0.5
      out.push(a.spot + (b.spot - a.spot) * frac)
    }
  }
  return out
}

export function nearest(values, target) {
  if (!values.length) return null
  return values.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best))
}

// Strike at which option holders collectively receive the least at expiry.
export function maxPain(rows) {
  const strikes = [...new Set(rows.map((r) => r.strike))].sort((a, b) => a - b)
  let best = null
  for (const k of strikes) {
    let payout = 0
    for (const r of rows) payout += r.oi * Math.max(0, r.cp === 'C' ? k - r.strike : r.strike - k)
    if (!best || payout < best.payout) best = { strike: k, payout }
  }
  return best?.strike ?? null
}

export function putCallRatio(rows, field = 'oi') {
  let calls = 0
  let puts = 0
  for (const r of rows) {
    if (r.cp === 'C') calls += r[field] ?? 0
    else puts += r[field] ?? 0
  }
  return { calls, puts, ratio: calls > 0 ? puts / calls : null }
}

export function heatmap(rows, spot, mult, { expiries, pctBand }) {
  const lo = spot * (1 - pctBand)
  const hi = spot * (1 + pctBand)
  const wanted = new Set(expiries)
  const cells = new Map()
  const k = spot * spot * 0.01 * mult
  for (const r of rows) {
    if (!wanted.has(r.expiry) || r.strike < lo || r.strike > hi) continue
    const key = `${r.expiry}|${r.strike}`
    cells.set(key, (cells.get(key) ?? 0) + sign(r) * gamma(spot, r.strike, r.T, r.iv) * r.oi * k)
  }
  const out = []
  for (const [key, gex] of cells) {
    const [expiry, strike] = key.split('|')
    out.push({ expiry, strike: Number(strike), gex })
  }
  out.sort((a, b) => (a.expiry === b.expiry ? a.strike - b.strike : a.expiry < b.expiry ? -1 : 1))
  return out
}
