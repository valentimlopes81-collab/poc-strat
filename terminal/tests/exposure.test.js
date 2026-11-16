import { describe, expect, it } from 'vitest'
import {
  charmFlow,
  gexByStrike,
  gexProfile,
  heatmap,
  maxPain,
  nearest,
  putCallRatio,
  strikesAround,
  topStrikes,
  totalDex,
  totalGex,
  vannaFlow,
  walls,
  zeroGammaCrossings,
} from '../api/_lib/exposure.js'

const row = (strike, cp, oi, extra = {}) => ({ strike, cp, oi, T: 10 / 365, iv: 0.25, expiry: '2026-11-27', ...extra })
const chain = [row(100, 'C', 500), row(100, 'P', 200), row(95, 'P', 900), row(105, 'C', 700), row(110, 'C', 100)]

describe('totals', () => {
  it('GEX is the sum of the per-strike values', () => {
    const agg = gexByStrike(chain, 100, 100)
    const sum = [...agg.values()].reduce((a, b) => a + b, 0)
    expect(totalGex(chain, 100, 100)).toBeCloseTo(sum, 4)
  })
  it('calls add to GEX and puts subtract', () => {
    expect(totalGex([row(100, 'C', 100)], 100)).toBeGreaterThan(0)
    expect(totalGex([row(100, 'P', 100)], 100)).toBeLessThan(0)
    expect(totalGex([row(100, 'C', 100), row(100, 'P', 100)], 100)).toBeCloseTo(0, 8)
  })
  it('DEX keeps the natural sign of delta', () => {
    expect(totalDex([row(100, 'C', 100)], 100)).toBeGreaterThan(0)
    expect(totalDex([row(100, 'P', 100)], 100)).toBeLessThan(0)
  })
  it('scales linearly with the contract multiplier', () => {
    expect(totalGex(chain, 100, 100)).toBeCloseTo(totalGex(chain, 100, 1) * 100, 4)
    expect(vannaFlow(chain, 100, 100)).toBeCloseTo(vannaFlow(chain, 100, 1) * 100, 6)
    expect(charmFlow(chain, 100, 100)).toBeCloseTo(charmFlow(chain, 100, 1) * 100, 6)
  })
})

describe('vanna and charm flow signs', () => {
  // OTM call: delta rises with vol, so if vol falls a dealer long that call
  // loses delta and buys to re-hedge
  it('long OTM calls: dealers buy when vol falls', () => {
    expect(vannaFlow([row(110, 'C', 100)], 100)).toBeGreaterThan(0)
  })
  it('short OTM puts: dealers buy when vol falls', () => {
    expect(vannaFlow([row(90, 'P', 100)], 100)).toBeGreaterThan(0)
  })
  // OTM call delta decays toward 0 with time: a dealer long it gets shorter and buys back
  it('long OTM calls: dealers buy as time passes', () => {
    expect(charmFlow([row(110, 'C', 100)], 100)).toBeGreaterThan(0)
  })
})

describe('walls and ranking', () => {
  it('call wall is the largest positive strike, put wall the most negative', () => {
    const { call, put } = walls(gexByStrike(chain, 100, 1))
    expect(call.strike).toBe(105)
    expect(put.strike).toBe(95)
  })
  it('topStrikes ranks by absolute value', () => {
    const top = topStrikes(new Map([[1, -5], [2, 3], [3, 9], [4, -1]]), 2)
    expect(top.map((t) => t.strike)).toEqual([3, 1])
  })
  it('strikesAround returns the nearest strikes in price order', () => {
    const agg = new Map([90, 95, 100, 105, 110].map((k) => [k, k]))
    expect(strikesAround(agg, 101, 3).map((s) => s.strike)).toEqual([95, 100, 105])
  })
})

describe('zero gamma', () => {
  it('finds where the profile changes sign', () => {
    const flips = zeroGammaCrossings([
      { spot: 90, gex: -4 },
      { spot: 100, gex: -1 },
      { spot: 110, gex: 3 },
    ])
    expect(flips).toHaveLength(1)
    expect(flips[0]).toBeCloseTo(102.5, 6)
  })
  it('puts below and calls above give a flip between them', () => {
    const book = [row(95, 'P', 1000), row(105, 'C', 1000)]
    const flips = zeroGammaCrossings(gexProfile(book, 100, 1, { loPct: 0.9, hiPct: 1.1, steps: 200 }))
    expect(flips).toHaveLength(1)
    expect(flips[0]).toBeGreaterThan(95)
    expect(flips[0]).toBeLessThan(105)
  })
  it('nearest picks the closest candidate and tolerates an empty list', () => {
    expect(nearest([90, 104, 130], 100)).toBe(104)
    expect(nearest([], 100)).toBeNull()
  })
})

describe('max pain and put/call ratio', () => {
  it('max pain is the strike where holders are paid the least', () => {
    // heavy calls at 100 and heavy puts at 110: anything between hurts both sides
    const book = [row(100, 'C', 1000), row(110, 'P', 1000), row(105, 'C', 10), row(105, 'P', 10)]
    expect(maxPain(book)).toBe(105)
  })
  it('max pain does not depend on implied vol', () => {
    const book = [row(100, 'C', 1000), row(110, 'P', 1000), row(105, 'C', 10, { iv: 0 }), row(105, 'P', 10, { iv: 0 })]
    expect(maxPain(book)).toBe(105)
  })
  it('ratio is puts over calls on the chosen field', () => {
    expect(putCallRatio(chain, 'oi').ratio).toBeCloseTo(1100 / 1300, 10)
    expect(putCallRatio([row(100, 'P', 5)], 'oi').ratio).toBeNull()
  })
})

describe('heatmap', () => {
  it('keeps only the requested expiries inside the price band', () => {
    const book = [row(100, 'C', 10), row(100, 'C', 10, { expiry: '2026-12-18' }), row(150, 'C', 10)]
    const cells = heatmap(book, 100, 1, { expiries: ['2026-11-27'], pctBand: 0.1 })
    expect(cells).toHaveLength(1)
    expect(cells[0]).toMatchObject({ expiry: '2026-11-27', strike: 100 })
  })
})
