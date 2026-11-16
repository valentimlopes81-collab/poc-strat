import { useId, useMemo, useState } from 'react'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import { useWidth } from '../lib/useWidth'

interface Marker {
  value: number
  label: string
  color: string
}

const PAD = { top: 16, right: 10, bottom: 22, left: 40 }

/**
 * Total GEX the book would have at each hypothetical price. Where the curve
 * crosses zero is the zero-gamma level; how steep it is around spot says how
 * fast the regime changes if price moves.
 */
export function GexProfile({
  points,
  spot,
  markers,
  fmtPrice,
}: {
  /** [price, total GEX in $B] */
  points: Array<[number, number]>
  spot: number
  markers: Marker[]
  fmtPrice: (p: number) => string
}) {
  const isFull = usePanelFullscreen()
  const [ref, width] = useWidth<HTMLDivElement>(480)
  const [hoverI, setHoverI] = useState<number | null>(null)
  const clipId = useId()
  const height = isFull ? 380 : 190

  const g = useMemo(() => {
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const yAbs = Math.max(...ys.map(Math.abs), 1e-9)
    // symmetric around zero so the zero line sits mid-plot and both regimes get equal room
    const x = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin || 1)) * (width - PAD.left - PAD.right)
    const y = (v: number) => PAD.top + ((yAbs - v) / (2 * yAbs)) * (height - PAD.top - PAD.bottom)
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')
    const area = `${line}L${x(xMax).toFixed(1)},${y(0)}L${x(xMin).toFixed(1)},${y(0)}Z`
    return { x, y, xMin, xMax, yAbs, line, area }
  }, [points, width, height])

  if (points.length < 2) return <div className="text-[11px] text-term-muted py-3">Sem dados.</div>

  const y0 = g.y(0)
  const hover = hoverI != null ? points[hoverI] : null
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(g.x(points[i][0]) - px) < Math.abs(g.x(points[best][0]) - px)) best = i
    setHoverI(best)
  }
  const xTicks = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => g.xMin + (g.xMax - g.xMin) * f)

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="block" onMouseMove={onMove} onMouseLeave={() => setHoverI(null)}>
        <defs>
          <clipPath id={`${clipId}-pos`}>
            <rect x={0} y={0} width={width} height={y0} />
          </clipPath>
          <clipPath id={`${clipId}-neg`}>
            <rect x={0} y={y0} width={width} height={height - y0} />
          </clipPath>
        </defs>
        <path d={g.area} fill="#00d964" opacity={0.16} clipPath={`url(#${clipId}-pos)`} />
        <path d={g.area} fill="#ff3b30" opacity={0.16} clipPath={`url(#${clipId}-neg)`} />
        <line x1={PAD.left} x2={width - PAD.right} y1={y0} y2={y0} stroke="#3a3a3a" strokeWidth={1} />
        <path d={g.line} fill="none" stroke="#00d964" strokeWidth={2} clipPath={`url(#${clipId}-pos)`} />
        <path d={g.line} fill="none" stroke="#ff3b30" strokeWidth={2} clipPath={`url(#${clipId}-neg)`} />
        {[g.yAbs, 0, -g.yAbs].map((v) => (
          <text key={v} x={PAD.left - 5} y={g.y(v) + 3} textAnchor="end" fontSize={9} fill="#7a7a7a">
            {v === 0 ? '0' : `${v > 0 ? '+' : ''}${v.toFixed(Math.abs(v) < 1 ? 2 : 1)}B`}
          </text>
        ))}
        {xTicks.map((v) => (
          <text key={v} x={g.x(v)} y={height - 6} textAnchor="middle" fontSize={9} fill="#7a7a7a">
            {fmtPrice(v)}
          </text>
        ))}
        {markers
          .filter((m) => m.value >= g.xMin && m.value <= g.xMax)
          .map((m, i) => (
            <g key={m.label}>
              <line x1={g.x(m.value)} x2={g.x(m.value)} y1={PAD.top} y2={height - PAD.bottom} stroke={m.color} strokeWidth={1} strokeDasharray="3 3" />
              <text x={g.x(m.value)} y={i % 2 ? PAD.top + 9 : PAD.top - 4} textAnchor="middle" fontSize={9} fill={m.color}>
                {m.label}
              </text>
            </g>
          ))}
        <line x1={g.x(spot)} x2={g.x(spot)} y1={PAD.top} y2={height - PAD.bottom} stroke="#e5e5e5" strokeWidth={1} />
        {hover && (
          <>
            <line x1={g.x(hover[0])} x2={g.x(hover[0])} y1={PAD.top} y2={height - PAD.bottom} stroke="#7a7a7a" strokeWidth={1} />
            <circle cx={g.x(hover[0])} cy={g.y(hover[1])} r={4} fill={hover[1] >= 0 ? '#00d964' : '#ff3b30'} stroke="#0a0a0a" strokeWidth={2} />
          </>
        )}
      </svg>
      {hover && (
        <div
          className="absolute pointer-events-none bg-term-panel2 border border-term-border px-2 py-1 text-[10px] z-10 whitespace-nowrap"
          style={{ left: Math.min(g.x(hover[0]) + 10, width - 170), top: PAD.top }}
        >
          <div className="text-term-muted">se o preço fosse</div>
          <div className="font-semibold">{fmtPrice(hover[0])}</div>
          <div className="text-term-text">
            GEX total {hover[1] >= 0 ? '+' : ''}
            {hover[1].toFixed(2)}B
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-term-muted mt-1">
        <span>
          <span className="inline-block w-3 h-px bg-term-text align-middle mr-1" />
          preço agora
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-term-green/60 mr-1" />
          GEX positivo (pin)
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-term-red/60 mr-1" />
          GEX negativo (amplifica)
        </span>
      </div>
    </div>
  )
}
