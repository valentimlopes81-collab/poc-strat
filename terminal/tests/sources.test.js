import { describe, expect, it } from 'vitest'
import { foldOptionsFlow, snapToGrid } from '../api/candles.js'
import { parseChain } from '../api/_lib/cboe.js'
import { parseSummary } from '../api/_lib/deribit.js'

const NOW = Date.parse('2026-11-16T17:00:00Z') // 12:00 New York, market open

const opt = (option, fields = {}) => ({ option, iv: 0.3, open_interest: 100, volume: 10, bid: 1, ask: 1.2, delta: 0.5, ...fields })

describe('Cboe chain', () => {
  const json = {
    timestamp: '2026-11-16 17:00:00',
    data: {
      current_price: 665.5,
      prev_day_close: 679.89,
      iv30: 27.4,
      last_trade_time: '2026-11-16T11:45:00',
      options: [
        opt('QQQ261116C00670000'),
        opt('QQQ261116P00500000', { iv: 0 }), // deep ITM, vendor reports no IV
        opt('QQQ261113C00670000'), // expired last Friday
        opt('QQQ261218P00650500', { bid: 0, ask: 0, last_trade_price: 7 }),
        opt('garbage'),
      ],
    },
  }
  const chain = parseChain(json, NOW)

  it('decodes the OCC symbol', () => {
    const c = chain.contracts.find((r) => r.expiry === '2026-12-18')
    expect(c).toMatchObject({ strike: 650.5, cp: 'P', dte: 32 })
  })
  it('drops expired and malformed contracts', () => {
    expect(chain.contracts).toHaveLength(3)
  })
  it('keeps contracts without IV for OI measures but out of the greek rows', () => {
    expect(chain.contracts.some((r) => r.iv === 0)).toBe(true)
    expect(chain.rows.every((r) => r.iv > 0)).toBe(true)
    expect(chain.rows).toHaveLength(2)
  })
  it('measures time to the 16:00 New York close', () => {
    const today = chain.rows.find((r) => r.expiry === '2026-11-16')
    expect(today.dte).toBe(0)
    expect(today.T * 365.25 * 24).toBeCloseTo(4, 6) // 12:00 -> 16:00
  })
  it('uses the mid when quoted and the last trade otherwise', () => {
    expect(chain.contracts[0].mid).toBeCloseTo(1.1, 10)
    expect(chain.contracts.find((r) => r.expiry === '2026-12-18').mid).toBe(7)
  })
  it('reads the quote and converts its New York time to UTC', () => {
    expect(chain.spot).toBe(665.5)
    expect(new Date(chain.quoteTimeMs).toISOString()).toBe('2026-11-16T16:45:00.000Z')
  })
})

describe('Deribit summary', () => {
  const rows = parseSummary(
    [
      { instrument_name: 'BTC-27NOV26-70000-C', mark_iv: 42.5, open_interest: 12, underlying_price: 65000, mark_price: 0.01 },
      { instrument_name: 'BTC-16NOV26-65000-P', mark_iv: 50, open_interest: 5 }, // settled at 08:00 UTC today
      { instrument_name: 'BTC-PERPETUAL', mark_iv: 0 },
      { instrument_name: 'BTC-27NOV26-60000-P', mark_iv: 0, open_interest: 3 },
    ],
    NOW,
  )
  it('keeps only live options with an IV', () => {
    expect(rows).toHaveLength(1)
  })
  it('decodes name, converts IV to a decimal and prices in USD', () => {
    expect(rows[0]).toMatchObject({ strike: 70000, cp: 'C', expiry: '2026-11-27', iv: 0.425, oi: 12, dte: 10 })
    expect(rows[0].mid).toBeCloseTo(650, 6)
  })
})

describe('candles', () => {
  it('snapToGrid folds the off-grid live print into its bar', () => {
    const out = snapToGrid(
      [
        { time: 1200, open: 10, high: 12, low: 9, close: 11, volume: 5 },
        { time: 1500, open: 11, high: 11, low: 10, close: 10.5, volume: 3 },
        { time: 1637, open: 13, high: 13, low: 13, close: 13, volume: 0 },
      ],
      300,
    )
    expect(out.map((c) => c.time)).toEqual([1200, 1500])
    expect(out[1]).toMatchObject({ open: 11, high: 13, low: 10, close: 13, volume: 3 })
  })
  it('foldOptionsFlow groups 1m bars into 5m buckets at UTC times', () => {
    const bar = (hhmm, close, calls, puts) => ({
      datetime: `2026-11-16T${hhmm}:00`,
      price: { open: close, high: close + 1, low: close - 1, close },
      volume: { stock_volume: 100, calls_volume: calls, puts_volume: puts },
    })
    const out = foldOptionsFlow([bar('09:31', 670, 10, 20), bar('09:34', 668, 5, 5), bar('09:35', 669, 1, 2)])
    expect(out).toHaveLength(2)
    expect(new Date(out[0].time * 1000).toISOString()).toBe('2026-11-16T14:30:00.000Z')
    expect(out[0]).toMatchObject({ open: 670, close: 668, high: 671, low: 667, volume: 200, calls_volume: 15, puts_volume: 25 })
  })
})
