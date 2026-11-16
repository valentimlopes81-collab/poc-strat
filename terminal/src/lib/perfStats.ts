import type { TradeRow } from '../types'

export interface PerfStats {
  count: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number | null
  /** average result per trade, in $ */
  expectancy: number
  /** average R multiple over the trades that have one */
  avgR: number | null
  /** largest peak-to-trough fall of cumulative P&L, in $ (positive number) */
  maxDrawdown: number
  longestWinStreak: number
  longestLossStreak: number
  bySide: Array<{ label: string; count: number; winRate: number; pnl: number }>
  byWeekday: Array<{ label: string; count: number; pnl: number }>
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

/** "−1R", "~−0.5R", "+2R", "0R" -> number; anything else -> null */
export function parseR(text: string | undefined): number | null {
  if (!text) return null
  const m = /([+\-−]?)\s*(\d+(?:[.,]\d+)?)\s*R/i.exec(text.replace('~', ''))
  if (!m) return null
  const v = Number(m[2].replace(',', '.'))
  return m[1] === '-' || m[1] === '−' ? -v : v
}

/** dd/mm of the journal -> weekday index (0 = Monday), assuming the given year */
function weekdayOf(date: string, year: number): number | null {
  const [dd, mm] = date.split('/').map(Number)
  if (!dd || !mm) return null
  const d = new Date(Date.UTC(year, mm - 1, dd)).getUTCDay()
  return d >= 1 && d <= 5 ? d - 1 : null
}

export function computePerf(trades: TradeRow[], year = new Date().getFullYear()): PerfStats {
  const pnl = (t: TradeRow) => Number(t.pnl_usd) || 0
  const sum = (arr: TradeRow[]) => arr.reduce((a, t) => a + pnl(t), 0)
  const wins = trades.filter((t) => t.result === 'Win')
  const losses = trades.filter((t) => t.result === 'Loss')
  const grossWin = sum(wins)
  const grossLoss = Math.abs(sum(losses))

  let equity = 0
  let peak = 0
  let maxDrawdown = 0
  let winStreak = 0
  let lossStreak = 0
  let longestWinStreak = 0
  let longestLossStreak = 0
  for (const t of trades) {
    equity += pnl(t)
    peak = Math.max(peak, equity)
    maxDrawdown = Math.max(maxDrawdown, peak - equity)
    winStreak = t.result === 'Win' ? winStreak + 1 : 0
    lossStreak = t.result === 'Loss' ? lossStreak + 1 : 0
    longestWinStreak = Math.max(longestWinStreak, winStreak)
    longestLossStreak = Math.max(longestLossStreak, lossStreak)
  }

  const rs = trades.map((t) => parseR(t.r_multiple)).filter((v): v is number => v != null)
  const side = (label: string, match: RegExp) => {
    const group = trades.filter((t) => match.test(t.direction ?? ''))
    return { label, count: group.length, winRate: group.length ? group.filter((t) => t.result === 'Win').length / group.length : 0, pnl: sum(group) }
  }
  const byWeekday = WEEKDAYS.map((label, i) => {
    const group = trades.filter((t) => weekdayOf(t.date, year) === i)
    return { label, count: group.length, pnl: sum(group) }
  })

  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: trades.length - wins.length - losses.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? sum(losses) / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    expectancy: trades.length ? sum(trades) / trades.length : 0,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
    maxDrawdown,
    longestWinStreak,
    longestLossStreak,
    bySide: [side('Long', /^long/i), side('Short', /^short/i)].filter((s) => s.count > 0),
    byWeekday,
  }
}
