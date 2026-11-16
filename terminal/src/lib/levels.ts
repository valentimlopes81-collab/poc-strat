import type { LiveLevel } from '../api'
import type { LevelRow } from '../types'

/** Live numbers with the manually written plan (bias, scenarios, ...) laid on top. */
export function withNarrative(live: LiveLevel, narrative: LevelRow[] | null): LevelRow {
  const n = narrative?.find((r) => r.asset === live.asset)
  return { ...live, bias: n?.bias ?? '', note: n?.note ?? '', scenarios: n?.scenarios, confirmation: n?.confirmation }
}

export const fmtInt = (v: number | null | undefined) => (v == null ? '—' : Math.round(v).toLocaleString('en-US'))

/** "680 · 28,063": a QQQ strike with its NQ-points equivalent. */
export const qqqStrikeLabel = (ratio: number | null) => (s: number) => (ratio ? `${s % 1 ? s.toFixed(1) : s} · ${fmtInt(s * ratio)}` : `${s} QQQ`)

export const signed = (v: number, dp = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(dp)}`
