import { useMemo } from 'react'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import type { IvSkewData } from '../types'

const W = 600
const H = 180
const PAD = { top: 10, right: 10, bottom: 20, left: 34 }

export interface SkewReference {
  label: string
  /** [moneyness %, iv %] */
  points: Array<[number, number]>
}

export function IvSkew({ data, previous }: { data: IvSkewData; previous?: SkewReference | null }) {
  const isFull = usePanelFullscreen()
  const { calls, puts, prev, xMin, xMax, yMin, yMax } = useMemo(() => {
    const calls = data.rows.filter((r) => r.cp === 'C').sort((a, b) => a.moneyness_pct - b.moneyness_pct)
    const puts = data.rows.filter((r) => r.cp === 'P').sort((a, b) => a.moneyness_pct - b.moneyness_pct)
    const all = data.rows
    const xMin = Math.min(...all.map((r) => r.moneyness_pct), 0)
    const xMax = Math.max(...all.map((r) => r.moneyness_pct), 0)
    // the reference is clipped to today's strike range so it cannot stretch the axes
    const prev = (previous?.points ?? []).filter(([m]) => m >= xMin && m <= xMax).sort((a, b) => a[0] - b[0])
    const ivs = [...all.map((r) => r.iv), ...prev.map((p) => p[1])]
    return { calls, puts, prev, xMin, xMax, yMin: Math.min(...ivs), yMax: Math.max(...ivs) }
  }, [data, previous])

  if (!data.rows.length) return null

  const xScale = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right)
  const yScale = (y: number) => H - PAD.bottom - ((y - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom)
  const pathFor = (rows: IvSkewData['rows']) => rows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${xScale(r.moneyness_pct)} ${yScale(r.iv)}`).join(' ')
  const zeroX = xScale(0)

  return (
    <div style={{ maxHeight: isFull ? '75vh' : undefined }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: isFull ? 320 : 180 }}>
        <line x1={zeroX} y1={PAD.top} x2={zeroX} y2={H - PAD.bottom} stroke="#ff9f1c" strokeDasharray="3,3" strokeWidth={1} />
        <text x={zeroX} y={PAD.top - 2} fill="#ff9f1c" fontSize={9} textAnchor="middle">ATM</text>
        {[yMin, (yMin + yMax) / 2, yMax].map((y, i) => (
          <text key={i} x={PAD.left - 4} y={yScale(y) + 3} fill="#7a7a7a" fontSize={9} textAnchor="end">
            {y.toFixed(0)}%
          </text>
        ))}
        {prev.length > 1 && (
          <path d={prev.map(([m, iv], i) => `${i === 0 ? 'M' : 'L'} ${xScale(m)} ${yScale(iv)}`).join(' ')} fill="none" stroke="#7a7a7a" strokeWidth={1.5} strokeDasharray="4,3" />
        )}
        <path d={pathFor(puts)} fill="none" stroke="#ff3b30" strokeWidth={1.5} />
        <path d={pathFor(calls)} fill="none" stroke="#00d964" strokeWidth={1.5} />
        {puts.map((r, i) => (
          <circle key={`p${i}`} cx={xScale(r.moneyness_pct)} cy={yScale(r.iv)} r={1.8} fill="#ff3b30" />
        ))}
        {calls.map((r, i) => (
          <circle key={`c${i}`} cx={xScale(r.moneyness_pct)} cy={yScale(r.iv)} r={1.8} fill="#00d964" />
        ))}
      </svg>
      <div className="flex items-center gap-4 text-[10px] text-term-muted mt-1">
        <span><span className="inline-block w-2 h-2 bg-term-green mr-1" />Calls</span>
        <span><span className="inline-block w-2 h-2 bg-term-red mr-1" />Puts</span>
        {prev.length > 1 && previous && (
          <span>
            <span className="inline-block w-3 border-t border-dashed border-term-muted align-middle mr-1" />
            {previous.label}
          </span>
        )}
        <span className="ml-auto">expiração {data.expiry.slice(5)} · eixo-x: % distância do spot</span>
      </div>
      <p className="mt-1 text-[10px] text-term-muted">
        Puts mais caras que calls equidistantes = procura de hedge de queda (skew normal em índices).
      </p>
    </div>
  )
}
