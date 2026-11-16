import { useEffect, useMemo, useState } from 'react'
import type { BtcCore, NqCore } from '../api'

export interface HistoryRow {
  /** epoch seconds */
  t: number
  nq?: { p: number | null; q: number | null; gex: number | null; zg: number | null; cw: number | null; pw: number | null; w0: number | null; vix: number | null; iv: number | null }
  btc?: { p: number | null; gex: number | null; zg: number | null; cw: number | null; pw: number | null; dvol: number | null; f: number | null }
}

export interface VolDay {
  t: number
  spot: number | null
  /** [dte, atm iv %, 25-delta risk reversal] */
  term: Array<[number, number, number | null]>
  skew_expiry: string | null
  /** [moneyness %, iv %] */
  skew: Array<[number, number]>
}

const KEY = 'nqbtc:history'
const KEEP_S = 3 * 24 * 3600
const MAX_ROWS = 3000

function readLocal(): HistoryRow[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(rows) ? (rows as HistoryRow[]) : []
  } catch {
    return []
  }
}

function toRow(nq: NqCore | null, btc: BtcCore | null): HistoryRow | null {
  const asOf = nq?.level.as_of_utc ?? btc?.level.as_of_utc
  if (!asOf) return null
  const row: HistoryRow = { t: Math.floor(new Date(asOf).getTime() / 1000) }
  if (nq) {
    const l = nq.level
    row.nq = { p: l.price, q: l.price_qqq ?? null, gex: l.gex_total_b, zg: l.zero_gamma_qqq ?? null, cw: l.call_wall_qqq ?? null, pw: l.put_wall_qqq ?? null, w0: nq.zero_dte?.gamma_wall_qqq ?? null, vix: l.vix, iv: nq.meta.iv30 }
  }
  if (btc) {
    const l = btc.level
    row.btc = { p: l.price, gex: l.gex_total_b, zg: l.zero_gamma, cw: l.call_wall, pw: l.put_wall, dvol: btc.meta.dvol, f: btc.meta.funding_8h_pct }
  }
  return row
}

/**
 * Levels over time. The repo history has a few readings a day; every live
 * refresh seen in this browser is added on top (kept locally for 3 days), so
 * a session left open gets minute resolution.
 */
export function useLevelHistory(server: HistoryRow[] | null, nq: NqCore | null, btc: BtcCore | null): HistoryRow[] {
  const [local, setLocal] = useState<HistoryRow[]>(readLocal)

  useEffect(() => {
    const row = toRow(nq, btc)
    if (!row) return
    setLocal((prev) => {
      if (prev.length && row.t - prev[prev.length - 1].t < 50) return prev
      const next = [...prev.filter((r) => row.t - r.t <= KEEP_S), row].slice(-MAX_ROWS)
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // storage full or blocked: this session still has the rows in memory
      }
      return next
    })
  }, [nq, btc])

  return useMemo(() => {
    const byMinute = new Map<number, HistoryRow>()
    for (const r of server ?? []) byMinute.set(Math.floor(r.t / 60), r)
    for (const r of local) byMinute.set(Math.floor(r.t / 60), r)
    return [...byMinute.values()].sort((a, b) => a.t - b.t)
  }, [server, local])
}
