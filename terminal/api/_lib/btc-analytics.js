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

const regimeLabel = (gexB) => (gexB < 0 ? 'Negativo (maior volatilidade)' : 'Positivo (regime de pin/baixa volatilidade)')

const ladder = (agg, n) =>
  topStrikes(agg, n)
    .sort((a, b) => a.strike - b.strike)
    .map((s) => ({ strike: s.strike, gex: round(s.value, 0) }))

function groupByExpiry(rows) {
  const map = new Map()
  for (const r of rows) {
    let g = map.get(r.expiry)
    if (!g) map.set(r.expiry, (g = []))
    g.push(r)
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

function atmIv(rows, spot) {
  let strike = null
  for (const r of rows) if (strike == null || Math.abs(r.strike - spot) < Math.abs(strike - spot)) strike = r.strike
  const ivs = rows.filter((r) => r.strike === strike).map((r) => r.iv)
  return ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null
}

export function buildBtcCore(allRows, spot, { dvol = null, perp = null, nowMs = Date.now() } = {}) {
  const rows = allRows.filter((r) => r.oi > 0 && r.dte <= 60)
  // contracts settling within the day are left out of vanna/charm (see nq-analytics.js)
  const flowRows = rows.filter((r) => r.T > 1 / 365.25)
  const gexAgg = gexByStrike(rows, spot)
  const { call: callWall, put: putWall } = walls(gexAgg)
  const gexTotalB = round(totalGex(rows, spot) / 1e9, 3)

  const fine = gexProfile(rows, spot, 1, { loPct: 0.8, hiPct: 1.2, steps: 240 })
  let flips = zeroGammaCrossings(fine)
  if (!flips.length) flips = zeroGammaCrossings(gexProfile(rows, spot))
  const zeroGamma = nearest(flips, spot)

  const byExpiry = groupByExpiry(rows)
  const nearestRows = byExpiry[0]?.[1] ?? []
  const pcrOi = putCallRatio(nearestRows, 'oi')
  const firstIv = nearestRows.length ? atmIv(nearestRows, spot) : null

  return {
    level: {
      asset: 'BTC',
      as_of_utc: new Date(nowMs).toISOString().slice(0, 19) + 'Z',
      price: round(spot, 2),
      price_ref: 'Deribit index',
      gex_total_b: gexTotalB,
      gex_regime: regimeLabel(gexTotalB),
      dex_total_b: round(totalDex(rows, spot) / 1e9, 2),
      call_wall: callWall?.strike ?? null,
      call_wall_ref: null,
      put_wall: putWall?.strike ?? null,
      put_wall_ref: null,
      zero_gamma: zeroGamma != null ? Math.round(zeroGamma) : null,
      zero_gamma_ref: null,
      dte0_dominant: null,
      dte0_dominant_ref: null,
      vix: null,
      vix_change_pct: null,
      vix_reading: null,
    },
    meta: {
      contracts: rows.length,
      dvol: round(dvol, 2),
      funding_8h_pct: perp?.funding_8h != null ? round(perp.funding_8h * 100, 4) : null,
      perp_oi_usd: perp?.open_interest ?? null,
      perp_mark: perp?.mark_price ?? null,
    },
    gex_strikes: ladder(gexAgg, 14),
    dex_strikes: ladder(dexByStrike(rows, spot), 14),
    vanna_strikes: ladder(vannaFlowByStrike(flowRows, spot), 14),
    charm_strikes: ladder(charmFlowByStrike(flowRows, spot), 14),
    flows: {
      vanna_per_volpt_b: round(vannaFlow(flowRows, spot) / 1e9, 4),
      charm_per_day_b: round(charmFlow(flowRows, spot) / 1e9, 4),
    },
    profile: gexProfile(rows, spot, 1, { loPct: 0.85, hiPct: 1.15, steps: 80 }).map((p) => [round(p.spot, 0), round(p.gex / 1e9, 5)]),
    zero_gammas: flips.map((f) => Math.round(f)),
    expected_moves: byExpiry
      .filter(([, g], i) => i === 0 || g[0].dte >= 5)
      .slice(0, 3)
      .map(([expiry, g]) => {
        const iv = atmIv(g, spot)
        const move = iv ? spot * iv * Math.sqrt(g[0].T) : null
        return { expiry, dte: g[0].dte, atm_iv: round(iv * 100, 2), straddle: null, sigma_move: round(move, 0), upper: round(spot + move, 0), lower: round(spot - move, 0) }
      }),
    max_pain: maxPain(nearestRows),
    max_pain_expiry: byExpiry[0]?.[0] ?? null,
    pcr_oi: round(pcrOi.ratio, 2),
    first_expiry_iv: round(firstIv != null ? firstIv * 100 : null, 2),
  }
}

export function buildBtcVol(allRows, spot) {
  const live = allRows.filter((r) => r.oi > 0)
  const byExpiry = groupByExpiry(live)
  const heatExpiries = byExpiry.filter(([, g]) => g[0].dte <= 45).slice(0, 6).map(([e]) => e)

  const term = byExpiry.slice(0, 12).map(([expiry, g]) => ({ expiry, dte: g[0].dte, atm_iv: round(atmIv(g, spot) * 100, 2), rr25: null }))

  const skewGroup = byExpiry.find(([, g]) => g[0].dte >= 2) ?? byExpiry[0]
  const skewRows = (skewGroup?.[1] ?? [])
    .filter((r) => r.strike >= spot * 0.8 && r.strike <= spot * 1.2 && (r.strike <= spot ? r.cp === 'P' : r.cp === 'C'))
    .map((r) => ({ strike: r.strike, moneyness_pct: round((r.strike / spot - 1) * 100, 2), iv: round(r.iv * 100, 2), cp: r.cp }))
    .sort((a, b) => a.strike - b.strike)

  return {
    as_of_utc: new Date().toISOString().slice(0, 19) + 'Z',
    heatmap: {
      spot,
      expiries: heatExpiries,
      rows: heatmap(live, spot, 1, { expiries: heatExpiries, pctBand: 0.15 }).map((r) => ({ ...r, gex: round(r.gex, 0) })),
    },
    iv_term: { spot, rows: term },
    iv_skew: { spot, expiry: skewGroup?.[0] ?? null, rows: skewRows },
  }
}
