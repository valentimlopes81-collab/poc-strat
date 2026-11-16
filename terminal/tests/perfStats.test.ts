import { describe, expect, it } from 'vitest'
import { computePerf, parseR } from '../src/lib/perfStats'
import type { TradeRow } from '../src/types'

const trade = (id: string, date: string, direction: string, result: TradeRow['result'], pnl: number, r = ''): TradeRow => ({
  id,
  date,
  direction,
  result,
  r_multiple: r,
  pnl_usd: pnl,
  pnl_approx: false,
  setup: '',
  notes_short: '',
})

describe('parseR', () => {
  it('reads the notations used in the journal', () => {
    expect(parseR('−1R')).toBe(-1)
    expect(parseR('~−0.5R')).toBe(-0.5)
    expect(parseR('+2R')).toBe(2)
    expect(parseR('0R')).toBe(0)
    expect(parseR('1,5R')).toBe(1.5)
  })
  it('returns null when there is no R multiple', () => {
    expect(parseR('')).toBeNull()
    expect(parseR('n/a')).toBeNull()
  })
})

describe('computePerf', () => {
  // 02/11/2026 is a Monday
  const trades = [
    trade('L1', '02/11', 'Long (1 MNQ)', 'Win', 200, '+2R'),
    trade('L2', '02/11', 'Short (1 MNQ)', 'Loss', -100, '−1R'),
    trade('L3', '03/11', 'Short (1 MNQ)', 'Loss', -150, '−1R'),
    trade('L4', '04/11', 'Long (1 MNQ)', 'BE', 0, '0R'),
    trade('L5', '06/11', 'Long (1 MNQ)', 'Win', 50),
  ]
  const s = computePerf(trades, 2026)

  it('counts outcomes and rates', () => {
    expect(s).toMatchObject({ count: 5, wins: 2, losses: 2, breakeven: 1 })
    expect(s.winRate).toBeCloseTo(0.4, 10)
    expect(s.profitFactor).toBeCloseTo(250 / 250, 10)
    expect(s.expectancy).toBeCloseTo(0, 10)
  })
  it('averages R over the trades that have one', () => {
    expect(s.avgR).toBeCloseTo((2 - 1 - 1 + 0) / 4, 10)
  })
  it('measures drawdown from the running peak', () => {
    // equity: 200, 100, -50, -50, 0 -> peak 200, trough -50
    expect(s.maxDrawdown).toBe(250)
  })
  it('finds the longest streaks', () => {
    expect(s.longestWinStreak).toBe(1)
    expect(s.longestLossStreak).toBe(2)
  })
  it('splits by side and weekday', () => {
    expect(s.bySide).toEqual([
      { label: 'Long', count: 3, winRate: 2 / 3, pnl: 250 },
      { label: 'Short', count: 2, winRate: 0, pnl: -250 },
    ])
    expect(s.byWeekday.map((d) => d.count)).toEqual([2, 1, 1, 0, 1])
    expect(s.byWeekday[0].pnl).toBe(100)
  })
  it('handles an empty journal', () => {
    expect(computePerf([], 2026)).toMatchObject({ count: 0, winRate: 0, expectancy: 0, profitFactor: null, avgR: null, maxDrawdown: 0 })
  })
})
