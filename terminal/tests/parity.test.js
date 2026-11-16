import { describe, expect, it } from 'vitest'
import { charm, delta, gamma, vanna } from '../api/_lib/bs.js'

// Same inputs and expected values as GOLDEN in tests/test_gex_common.py:
// the Python scripts (briefings) and these functions (the site) must agree.
const [S, K, T, IV] = [665, 670, 20 / 365, 0.28]

describe('parity with backtest/quant/gex_common.py', () => {
  it('matches the shared reference values', () => {
    expect(gamma(S, K, T, IV)).toBeCloseTo(0.00914239462, 11)
    expect(delta(S, K, T, IV, 'C')).toBeCloseTo(0.480828454388, 11)
    expect(delta(S, K, T, IV, 'P')).toBeCloseTo(-0.519171545612, 11)
    expect(vanna(S, K, T, IV)).toBeCloseTo(0.161694546731, 11)
    expect(charm(S, K, T, IV)).toBeCloseTo(-0.65631726379, 11)
  })
})
