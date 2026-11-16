import { useState } from 'react'
import { fmtCompact } from '../lib/useJson'
import { useWidth } from '../lib/useWidth'
import type { StrikeValue } from '../api'

type Item = { type: 'strike'; strike: number; gex: number } | { type: 'price'; strike: number }

// signed log scale: keeps the sign and compresses the range (walls span ~1M to
// ~500M on the same ladder, a linear scale would flatten all but the largest)
function symlog(v: number, maxAbs: number, halfWidth: number): number {
  const k = 1e6
  const scale = (x: number) => Math.sign(x) * Math.log1p(Math.abs(x) / k)
  return (scale(v) / (scale(maxAbs) || 1)) * halfWidth
}

/** Ladder of a signed per-strike exposure, with the current price slotted in at its place. */
export function GexDepthChart({
  rows,
  priceVal,
  fmtStrike,
  label = 'GEX',
  positiveHint,
  negativeHint,
}: {
  rows: StrikeValue[]
  priceVal: number | null
  fmtStrike: (s: number) => string
  label?: string
  positiveHint?: string
  negativeHint?: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<{ x: number; y: number; strike: number; gex: number } | null>(null)

  const items: Item[] = rows.map((d) => ({ type: 'strike', strike: d.strike, gex: d.gex }))
  if (priceVal != null) items.push({ type: 'price', strike: priceVal })
  items.sort((a, b) => b.strike - a.strike)

  const rowH = 20
  const margin = { top: 4, right: 12, bottom: 4, left: Math.min(128, Math.max(64, width * 0.3)) }
  const h = items.length * rowH + margin.top + margin.bottom
  const maxAbs = Math.max(...rows.map((d) => Math.abs(d.gex)), 1)
  const innerW = Math.max(40, width - margin.left - margin.right)
  const cx = margin.left + innerW / 2

  if (!rows.length) return <div className="text-[11px] text-term-muted py-3">Sem dados.</div>

  return (
    <div ref={ref} className="relative w-full">
      {(positiveHint || negativeHint) && (
        <div className="flex justify-between text-[9px] uppercase tracking-wide text-term-muted mb-0.5" style={{ paddingLeft: margin.left, paddingRight: margin.right }}>
          <span>◀ {negativeHint}</span>
          <span>{positiveHint} ▶</span>
        </div>
      )}
      <svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`} className="block">
        <line x1={cx} x2={cx} y1={0} y2={h} stroke="#242424" strokeWidth={1} />
        {items.map((d, i) => {
          const cy = margin.top + i * rowH + rowH / 2
          if (d.type === 'price') {
            return (
              <g key={`p-${i}`}>
                <line x1={margin.left} x2={width - margin.right} y1={cy} y2={cy} stroke="#ff9f1c" strokeWidth={1} />
                <text x={margin.left - 8} y={cy} textAnchor="end" dominantBaseline="middle" fontSize={10} fontWeight={700} fill="#ff9f1c">
                  ▸ {fmtStrike(d.strike)}
                </text>
              </g>
            )
          }
          const x1 = cx + symlog(d.gex, maxAbs, innerW / 2)
          return (
            <g key={`s-${i}`} onMouseEnter={() => setHover({ x: x1, y: cy, strike: d.strike, gex: d.gex })} onMouseLeave={() => setHover(null)}>
              <rect x={margin.left} y={cy - rowH / 2} width={innerW} height={rowH} fill="transparent" />
              <rect
                x={Math.min(cx, x1)}
                y={cy - rowH * 0.3}
                width={Math.max(Math.abs(x1 - cx), 1)}
                height={rowH * 0.6}
                fill={d.gex >= 0 ? '#00d964' : '#ff3b30'}
                opacity={hover && hover.strike !== d.strike ? 0.55 : 1}
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
          className="absolute pointer-events-none bg-term-panel2 border border-term-border px-2 py-1 text-[10px] z-10 whitespace-nowrap"
          style={{ left: Math.min(Math.max(hover.x + 8, 0), width - 150), top: hover.y + 14 }}
        >
          <div className="font-semibold">{fmtStrike(hover.strike)}</div>
          <div className="text-term-text">
            {label} {hover.gex >= 0 ? '+' : ''}
            {fmtCompact(hover.gex)}
          </div>
        </div>
      )}
    </div>
  )
}
