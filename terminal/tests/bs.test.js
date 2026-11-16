import { describe, expect, it } from 'vitest'
import { charm, delta, gamma, MIN_T_YEARS, normCdf, price, vanna } from '../api/_lib/bs.js'

const S = 665
const K = 670
const T = 20 / 365
const IV = 0.28

// numerical derivative of fn at x
const d = (fn, x, h) => (fn(x + h) - fn(x - h)) / (2 * h)

describe('normCdf', () => {
  it('matches known values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 12)
    expect(normCdf(1.96)).toBeCloseTo(0.9750021048517795, 12)
    expect(normCdf(-1.96)).toBeCloseTo(0.024997895148220435, 12)
    expect(normCdf(-8)).toBeCloseTo(6.220960574271785e-16, 20)
  })
})

describe('greeks agree with finite differences of the price', () => {
  for (const cp of ['C', 'P']) {
    it(`delta (${cp})`, () => {
      expect(delta(S, K, T, IV, cp)).toBeCloseTo(d((s) => price(s, K, T, IV, cp), S, 0.01), 5)
    })
    it(`gamma (${cp})`, () => {
      expect(gamma(S, K, T, IV)).toBeCloseTo(d((s) => delta(s, K, T, IV, cp), S, 0.01), 6)
    })
    it(`vanna (${cp})`, () => {
      expect(vanna(S, K, T, IV)).toBeCloseTo(d((v) => delta(S, K, T, v, cp), IV, 1e-4), 4)
    })
    it(`charm (${cp})`, () => {
      // time passing = T shrinking, hence the minus
      expect(charm(S, K, T, IV)).toBeCloseTo(-d((t) => delta(S, K, t, IV, cp), T, 1e-5), 3)
    })
  }
})

describe('edge cases', () => {
  it('put-call parity holds', () => {
    const lhs = price(S, K, T, IV, 'C') - price(S, K, T, IV, 'P')
    expect(lhs).toBeCloseTo(S - K * Math.exp(-0.04 * T), 4)
  })
  it('call and put deltas differ by exactly one', () => {
    expect(delta(S, K, T, IV, 'C') - delta(S, K, T, IV, 'P')).toBeCloseTo(1, 10)
  })
  it('floors time to expiry so gamma stays finite at the close', () => {
    expect(gamma(S, S, 0, IV)).toBe(gamma(S, S, MIN_T_YEARS, IV))
    expect(Number.isFinite(gamma(S, S, 1e-12, IV))).toBe(true)
  })
  it('returns 0 on unusable inputs instead of NaN', () => {
    expect(gamma(S, K, T, 0)).toBe(0)
    expect(delta(0, K, T, IV, 'C')).toBe(0)
    expect(vanna(S, 0, T, IV)).toBe(0)
  })
})
