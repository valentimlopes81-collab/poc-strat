import { useEffect, useRef, useState } from 'react'
import { fmtCompact } from '../lib/useJson'
import type { GexStrikeRow } from '../types'

type Item =
  | { type: 'strike'; strike: number; gex: number }
  | { type: 'price'; strike: number }

function symlog(v: number, maxAbs: number, halfWidth: number): number {
  // signed log scale: preserves sign, compresses huge dynamic range (we have
  // GEX walls spanning ~1M to ~100M on the same chart)
  const k = 1e6 // linear-ish region below this, log above
  const scale = (x: number) => Math.sign(x) * Math.log1p(Math.abs(x) / k)
  const maxScaled = scale(maxAbs) || 1
  return (scale(v) / maxScaled) * halfWidth
}

export function GexDepthChart({
  rows,
  priceVal,
  fmtStrike,
  height,
}: {
  rows: GexStrikeRow[]
  priceVal: number | null
  fmtStrike: (s: number) => string
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  const [hover, setHover] = useState<{ x: number; y: number; strike: number; gex: number } | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const sorted = [...rows].sort((a, b) => a.strike - b.strike)
  const items: Item[] = sorted.map((d) => ({ type: 'strike', strike: d.strike, gex: d.gex }))
  if (priceVal != null) items.push({ type: 'price', strike: priceVal })
  items.sort((a, b) => a.strike - b.strike)

  const rowH = 22
  const margin = { top: 6, right: 96, bottom: 6, left: 70 }
  const h = height ?? items.length * rowH + margin.top + margin.bottom
  const maxAbs = Math.max(...sorted.map((d) => Math.abs(d.gex)), 1)
  const innerW = width - margin.left - margin.right
  const cx = margin.left + innerW / 2

  return (
    <div ref={ref} className="relative w-full" style={{ minHeight: h }}>
      <svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`} className="block">
        <line x1={cx} x2={cx} y1={0} y2={h} stroke="#242424" strokeWidth={1} />
        {items.map((d, i) => {
          const cy = margin.top + i * rowH + rowH / 2
          if (d.type === 'price') {
            return (
              <g key={`p-${i}`}>
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={cy}
                  y2={cy}
                  stroke="#ff9f1c"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <text x={width - margin.right + 6} y={cy} dominantBaseline="middle" fontSize={9} fontWeight={700} fill="#ff9f1c">
                  NOW {fmtStrike(d.strike)}
                </text>
              </g>
            )
          }
          const barHalf = symlog(d.gex, maxAbs, innerW / 2)
          const x0 = cx
          const x1 = cx + barHalf
          const color = d.gex >= 0 ? '#00d964' : '#ff3b30'
          return (
            <g key={`s-${i}`}>
              <rect
                x={Math.min(x0, x1)}
                y={cy - rowH * 0.3}
                width={Math.max(Math.abs(x1 - x0), 1)}
                height={rowH * 0.6}
                fill={color}
                onMouseEnter={() => setHover({ x: x1, y: cy, strike: d.strike, gex: d.gex })}
                onMouseLeave={() => setHover(null)}
              />
              <text x={margin.left - 8} y={cy} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#7a7a7a">
                {fmtStrike(d.strike)}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <div
          className="absolute pointer-events-none bg-term-panel2 border border-term-border px-2 py-1 text-[10px] z-10"
          style={{ left: hover.x + 8, top: hover.y - 10 }}
        >
          <div className="font-semibold">{fmtStrike(hover.strike)}</div>
          <div className={hover.gex >= 0 ? 'text-term-green' : 'text-term-red'}>
            GEX {hover.gex >= 0 ? '+' : ''}
            {fmtCompact(hover.gex)}
          </div>
        </div>
      )}
    </div>
  )
}
