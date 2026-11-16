import { describe, expect, it } from 'vitest'
import { buildBtcCore } from '../api/_lib/btc-analytics.js'
import { alignedRatio, buildCore, buildVol, vixReading } from '../api/_lib/nq-analytics.js'

const NOW = Date.parse('2026-11-16T17:00:00Z')
const HOUR = 1 / 24 / 365.25

function contract(strike, cp, oi, { expiry = '2026-11-16', dte = 0, T = 4 * HOUR, iv = 0.3, volume = 0, mid = 1, delta = null } = {}) {
  return { strike, cp, oi, expiry, dte, T, iv, volume, mid, delta }
}

function chainOf(contracts, spot = 665) {
  return { contracts, rows: contracts.filter((c) => c.iv > 0), spot, prevClose: 680, iv30: 27, iv30Change: 1, quoteTimeMs: NOW - 15 * 60_000 }
}

const weekly = { expiry: '2026-11-20', dte: 4, T: 4.2 / 365.25 }
const book = [
  contract(660, 'P', 5000, { volume: 300 }),
  contract(665, 'C', 800, { volume: 50, mid: 2 }),
  contract(665, 'P', 900, { volume: 70, mid: 2.2 }),
  contract(670, 'C', 6000, { volume: 400 }),
  contract(650, 'P', 9000, weekly),
  contract(665, 'C', 1000, { ...weekly, mid: 9 }),
  contract(665, 'P', 1000, { ...weekly, mid: 10 }),
  contract(680, 'C', 7000, weekly),
  contract(500, 'P', 4000, { iv: 0 }), // no IV: still counts for OI measures
]

describe('alignedRatio', () => {
  const candles = [
    { time: (NOW - 20 * 60_000) / 1000, open: 27400, close: 27410 },
    { time: (NOW - 15 * 60_000) / 1000, open: 27410, close: 27430 },
    { time: (NOW - 10 * 60_000) / 1000, open: 27430, close: 27500 },
  ]
  it('pairs the delayed quote with the futures price at the same time, not the latest', () => {
    expect(alignedRatio(665, NOW - 15 * 60_000, candles)).toBeCloseTo(27410 / 665, 8)
  })
  it('falls back to the latest futures price without a quote time', () => {
    expect(alignedRatio(665, null, candles)).toBeCloseTo(27500 / 665, 8)
  })
  it('rejects a ratio that cannot be NQ/QQQ', () => {
    expect(alignedRatio(665, null, [{ time: 1, open: 100, close: 100 }])).toBeNull()
    expect(alignedRatio(665, null, [])).toBeNull()
  })
})

describe('buildCore', () => {
  const ratio = 41.2
  const nqCandles = [{ time: (NOW - 15 * 60_000) / 1000, open: 665 * ratio, close: 665 * ratio }]
  const core = buildCore(chainOf(book), { nqCandles, nqLast: 666 * ratio, vix: { value: 21.6, changePct: 12 }, nowMs: NOW })

  it('moves the spot with the futures since the delayed quote', () => {
    expect(core.meta.ratio).toBeCloseTo(ratio, 4)
    expect(core.level.price_qqq).toBeCloseTo(666, 2)
    expect(core.meta.spot_qqq_delayed).toBe(665)
    expect(core.meta.spot_basis).toBe('futuros')
  })
  it('reports walls in QQQ and in NQ points', () => {
    expect(core.level.call_wall_qqq).toBe(670)
    expect(core.level.put_wall_qqq).toBe(660)
    expect(core.level.call_wall).toBe(Math.round(670 * ratio))
    expect(core.level.call_wall_ref).toContain('670.0 QQQ')
  })
  it('puts zero gamma between the put wall and the call wall', () => {
    expect(core.level.zero_gamma_qqq).toBeGreaterThan(660)
    expect(core.level.zero_gamma_qqq).toBeLessThan(670)
  })
  it('isolates the expiry that ends within 24h as 0DTE', () => {
    expect(core.zero_dte.expiry).toBe('2026-11-16')
    expect(core.zero_dte.put_support_qqq).toBe(660)
    expect(core.zero_dte.call_resistance_qqq).toBe(670)
    expect(core.zero_dte.volume_puts).toBe(370)
  })
  it('max pain and put/call use every contract, including those without IV', () => {
    expect(core.max_pain_expiry).toBe('2026-11-16')
    expect(core.pcr_oi).toBeCloseTo((5000 + 900 + 4000) / (800 + 6000), 2)
  })
  it('expected move comes from the ATM IV and straddle of each expiry', () => {
    const [today, week] = core.expected_moves
    expect(today).toMatchObject({ expiry: '2026-11-16', dte: 0, atm_iv: 30, straddle: 4.2 })
    expect(today.sigma_move).toBeCloseTo(666 * 0.3 * Math.sqrt(4 * HOUR), 1)
    expect(week).toMatchObject({ expiry: '2026-11-20', straddle: 19 })
    expect(week.upper - week.lower).toBeCloseTo(2 * week.sigma_move, 1)
  })
  it('carries VIX through with its reading', () => {
    expect(core.level.vix).toBe(21.6)
    expect(core.level.vix_reading).toBe(vixReading(21.6))
  })
  it('works from the delayed quote alone when the futures feed is down', () => {
    const solo = buildCore(chainOf(book), { nowMs: NOW })
    expect(solo.meta.ratio).toBeNull()
    expect(solo.meta.spot_basis).toBe('cboe_delayed')
    expect(solo.level.price_qqq).toBe(665)
    expect(solo.level.call_wall).toBeNull()
    expect(solo.level.call_wall_qqq).toBe(670)
  })
  it('reports no 0DTE when the next expiry is more than a day away', () => {
    const later = book.filter((c) => c.expiry !== '2026-11-16')
    expect(buildCore(chainOf(later), { nowMs: NOW }).zero_dte).toBeNull()
  })
})

describe('buildVol', () => {
  const liquid = [640, 650, 660, 670, 680, 690].flatMap((k) => [
    contract(k, 'C', 500, { ...weekly, iv: 0.3 + Math.abs(k - 665) / 1000, delta: k > 665 ? 0.25 : 0.8 }),
    contract(k, 'P', 500, { ...weekly, iv: 0.32 + Math.abs(k - 665) / 1000, delta: k < 665 ? -0.25 : -0.8 }),
  ])
  const vol = buildVol(chainOf([...liquid, contract(665, 'C', 500), contract(665, 'P', 500)]))

  it('skew keeps only the out-of-the-money side of each strike', () => {
    expect(vol.iv_skew.expiry).toBe('2026-11-20')
    for (const r of vol.iv_skew.rows) expect(r.cp).toBe(r.strike <= 665 ? 'P' : 'C')
  })
  it('surface leaves out an expiry in its last day', () => {
    expect(vol.iv_surface.expiries.map((e) => e.expiry)).toEqual(['2026-11-20'])
  })
  it('term structure has one row per expiry with a 25-delta risk reversal', () => {
    expect(vol.iv_term.rows.map((r) => r.expiry)).toEqual(['2026-11-16', '2026-11-20'])
    expect(vol.iv_term.rows[1].rr25).toBeLessThan(0) // puts richer than calls
  })
})

describe('buildBtcCore', () => {
  const rows = [
    { strike: 60000, cp: 'P', oi: 800, T: 0.03, iv: 0.45, expiry: '2026-11-27', dte: 10, volume: 0, mid: 0 },
    { strike: 65000, cp: 'C', oi: 100, T: 0.03, iv: 0.42, expiry: '2026-11-27', dte: 10, volume: 0, mid: 0 },
    { strike: 65000, cp: 'P', oi: 100, T: 0.03, iv: 0.42, expiry: '2026-11-27', dte: 10, volume: 0, mid: 0 },
    { strike: 70000, cp: 'C', oi: 900, T: 0.03, iv: 0.44, expiry: '2026-11-27', dte: 10, volume: 0, mid: 0 },
    { strike: 90000, cp: 'C', oi: 500, T: 0.5, iv: 0.5, expiry: '2027-05-28', dte: 190, volume: 0, mid: 0 },
  ]
  const core = buildBtcCore(rows, 65000, { dvol: 42.93, perp: { funding_8h: 0.0000841, open_interest: 7e8, mark_price: 65010 }, nowMs: NOW })

  it('ignores expiries beyond the 60 day window', () => {
    expect(core.meta.contracts).toBe(4)
    expect(core.level.call_wall).toBe(70000)
    expect(core.level.put_wall).toBe(60000)
  })
  it('exposes DVOL and funding as a percentage', () => {
    expect(core.meta.dvol).toBe(42.93)
    expect(core.meta.funding_8h_pct).toBeCloseTo(0.0084, 4)
  })
  it('zero gamma sits between the walls', () => {
    expect(core.level.zero_gamma).toBeGreaterThan(60000)
    expect(core.level.zero_gamma).toBeLessThan(70000)
  })
})
