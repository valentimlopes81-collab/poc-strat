import { useMemo } from 'react'
import { fmtCompact } from '../lib/useJson'
import type { HeatmapData } from './GexHeatmap'

export function GammaByExpiry({ data }: { data: HeatmapData }) {
  const byExpiry = useMemo(() => {
    const sums = new Map<string, number>()
    for (const r of data.rows) sums.set(r.expiry, (sums.get(r.expiry) ?? 0) + r.gex)
    const today = new Date().toISOString().slice(0, 10)
    const rows = data.expiries.map((e) => ({ expiry: e, gex: sums.get(e) ?? 0, isToday: e === today }))
    const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.gex)))
    const dominant = rows.reduce((best, r) => (Math.abs(r.gex) > Math.abs(best.gex) ? r : best), rows[0])
    return { rows, maxAbs, dominant }
  }, [data])

  if (!byExpiry.rows.length) return null

  return (
    <div className="mb-3 pb-3 border-b border-term-border">
      <div className="text-[10px] uppercase tracking-wide text-term-muted mb-1.5">
        Gamma por expiração {byExpiry.dominant && <span className="text-term-amber">· dominante: {byExpiry.dominant.expiry.slice(5)}</span>}
      </div>
      <div className="flex flex-col gap-1">
        {byExpiry.rows.map((r) => {
          const pct = (Math.abs(r.gex) / byExpiry.maxAbs) * 100
          const isDominant = r.expiry === byExpiry.dominant.expiry
          return (
            <div key={r.expiry} className="flex items-center gap-2 text-[10px]">
              <span className={`w-14 shrink-0 tabular-nums ${isDominant ? 'text-term-amber font-bold' : 'text-term-muted'}`}>
                {r.expiry.slice(5)}
                {r.isToday ? ' •0' : ''}
              </span>
              <div className="flex-1 h-3 bg-black/40 relative overflow-hidden">
                <div
                  className={`h-full ${r.gex >= 0 ? 'bg-term-green' : 'bg-term-red'} ${isDominant ? 'opacity-100' : 'opacity-60'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`w-14 shrink-0 text-right tabular-nums ${r.gex >= 0 ? 'text-term-green' : 'text-term-red'}`}>
                {r.gex >= 0 ? '+' : ''}
                {fmtCompact(r.gex)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
