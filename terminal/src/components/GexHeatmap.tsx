import { useMemo, useState } from 'react'
import { fmtCompact } from '../lib/useJson'

export interface HeatmapData {
  spot: number
  expiries: string[]
  rows: Array<{ expiry: string; strike: number; gex: number }>
}

export function GexHeatmap({ data, fmtStrike }: { data: HeatmapData; fmtStrike: (s: number) => string }) {
  const [hover, setHover] = useState<{ expiry: string; strike: number; gex: number } | null>(null)

  const { strikes, cellMap, maxAbs, expiries } = useMemo(() => {
    const strikeSet = new Set<number>()
    const map = new Map<string, number>()
    let max = 1
    for (const r of data.rows) {
      strikeSet.add(r.strike)
      map.set(`${r.expiry}|${r.strike}`, r.gex)
      max = Math.max(max, Math.abs(r.gex))
    }
    const strikesSorted = Array.from(strikeSet).sort((a, b) => b - a)
    return { strikes: strikesSorted, cellMap: map, maxAbs: max, expiries: data.expiries }
  }, [data])

  const colorFor = (v: number | undefined) => {
    if (v === undefined) return 'transparent'
    const t = Math.min(1, Math.log1p(Math.abs(v)) / Math.log1p(maxAbs))
    const alpha = 0.12 + t * 0.78
    return v >= 0 ? `rgba(0,217,100,${alpha.toFixed(2)})` : `rgba(255,59,48,${alpha.toFixed(2)})`
  }

  // nearest strike row to spot, for a highlight marker
  const nearestStrike = strikes.reduce((best, s) => (Math.abs(s - data.spot) < Math.abs(best - data.spot) ? s : best), strikes[0] ?? 0)

  return (
    <div className="relative">
      <div className="overflow-auto max-h-[440px]">
        <table className="border-collapse text-[10px] w-full">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-term-panel text-term-muted text-right pr-2 py-1 font-normal">strike</th>
              {expiries.map((e) => (
                <th key={e} className="sticky top-0 z-10 bg-term-panel text-term-muted font-normal px-1 py-1 whitespace-nowrap">
                  {e.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strikes.map((s) => (
              <tr key={s} className={s === nearestStrike ? 'outline outline-1 outline-term-amber' : ''}>
                <td
                  className={`sticky left-0 z-10 bg-term-panel text-right pr-2 tabular-nums whitespace-nowrap ${
                    s === nearestStrike ? 'text-term-amber font-bold' : 'text-term-muted'
                  }`}
                >
                  {fmtStrike(s)}
                  {s === nearestStrike ? ' ◀' : ''}
                </td>
                {expiries.map((e) => {
                  const v = cellMap.get(`${e}|${s}`)
                  return (
                    <td
                      key={e}
                      className="w-8 h-[15px] cursor-default"
                      style={{ background: colorFor(v) }}
                      onMouseEnter={() => v !== undefined && setHover({ expiry: e, strike: s, gex: v })}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hover && (
        <div className="absolute top-0 right-0 bg-term-panel2 border border-term-border px-2 py-1 text-[11px] pointer-events-none">
          <div className="font-semibold">
            {fmtStrike(hover.strike)} · {hover.expiry}
          </div>
          <div className={hover.gex >= 0 ? 'text-term-green' : 'text-term-red'}>
            GEX {hover.gex >= 0 ? '+' : ''}
            {fmtCompact(hover.gex)}
          </div>
        </div>
      )}
    </div>
  )
}
