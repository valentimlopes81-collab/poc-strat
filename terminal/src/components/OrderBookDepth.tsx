import { useMemo, useState } from 'react'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import type { BookLevel } from '../lib/kraken'
import { useWidth } from '../lib/useWidth'
import { StatRow } from './Panel'

const PAD = { top: 8, right: 8, bottom: 20, left: 8 }

interface Point {
  price: number
  cum: number
}

function cumulate(levels: BookLevel[], limit: (price: number) => boolean): Point[] {
  const out: Point[] = []
  let cum = 0
  for (const [price, qty] of levels) {
    if (!limit(price)) break
    cum += qty
    out.push({ price, cum })
  }
  return out
}

const fmtUsd = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}`

/** Cumulative resting bids and asks around the mid price: how much size stands in the way on each side. */
export function OrderBookDepth({ bids, asks }: { bids: BookLevel[]; asks: BookLevel[] }) {
  const isFull = usePanelFullscreen()
  const [ref, width] = useWidth<HTMLDivElement>(480)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const height = isFull ? 360 : 170

  const g = useMemo(() => {
    if (!bids.length || !asks.length) return null
    const mid = (bids[0][0] + asks[0][0]) / 2
    // same distance on both sides, as far as the shallower side of the feed reaches
    const span = Math.min(mid - bids[bids.length - 1][0], asks[asks.length - 1][0] - mid)
    const bidPts = cumulate(bids, (p) => p >= mid - span)
    const askPts = cumulate(asks, (p) => p <= mid + span)
    const bidTotal = bidPts.at(-1)?.cum ?? 0
    const askTotal = askPts.at(-1)?.cum ?? 0
    const yMax = Math.max(bidTotal, askTotal, 1e-9)
    const x = (p: number) => PAD.left + ((p - (mid - span)) / (2 * span)) * (width - PAD.left - PAD.right)
    const y = (c: number) => height - PAD.bottom - (c / yMax) * (height - PAD.top - PAD.bottom)
    const base = y(0)
    // stepped: size only changes at a price level
    const step = (pts: Point[], edge: number) => {
      let d = `M${x(mid).toFixed(1)},${base}`
      let prevY = base
      for (const p of pts) {
        d += `L${x(p.price).toFixed(1)},${prevY.toFixed(1)}L${x(p.price).toFixed(1)},${y(p.cum).toFixed(1)}`
        prevY = y(p.cum)
      }
      return `${d}L${x(edge).toFixed(1)},${prevY.toFixed(1)}L${x(edge).toFixed(1)},${base}Z`
    }
    const wall = (levels: BookLevel[], inRange: (p: number) => boolean) =>
      levels.filter(([p]) => inRange(p)).reduce<BookLevel | null>((best, l) => (!best || l[1] > best[1] ? l : best), null)
    return {
      mid,
      span,
      x,
      bidPts,
      askPts,
      bidTotal,
      askTotal,
      bidPath: step(bidPts, mid - span),
      askPath: step(askPts, mid + span),
      bidWall: wall(bids, (p) => p >= mid - span),
      askWall: wall(asks, (p) => p <= mid + span),
    }
  }, [bids, asks, width, height])

  if (!g) return <div className="text-[11px] text-term-muted py-6 text-center">A ligar ao livro de ordens…</div>

  const spread = asks[0][0] - bids[0][0]
  const imbalance = (g.bidTotal - g.askTotal) / (g.bidTotal + g.askTotal || 1)
  let hover: { price: number; cum: number; side: 'bid' | 'ask' } | null = null
  if (hoverX != null) {
    const price = g.mid - g.span + ((hoverX - PAD.left) / (width - PAD.left - PAD.right)) * 2 * g.span
    if (price < g.mid) {
      const pt = g.bidPts.findLast((p) => p.price >= price) ?? g.bidPts[0]
      if (pt) hover = { price, cum: pt.cum, side: 'bid' }
    } else {
      const pt = g.askPts.findLast((p) => p.price <= price) ?? g.askPts[0]
      if (pt) hover = { price, cum: pt.cum, side: 'ask' }
    }
  }

  return (
    <div>
      <StatRow label="Spread" value={`${fmtUsd(spread)} · ${((spread / g.mid) * 1e4).toFixed(2)} bps`} />
      <StatRow
        label={`Profundidade ±${((g.span / g.mid) * 100).toFixed(2)}% · bids / asks`}
        value={`${g.bidTotal.toFixed(1)} / ${g.askTotal.toFixed(1)} BTC`}
      />
      <StatRow
        label="Desequilíbrio do livro"
        value={`${imbalance >= 0 ? '+' : ''}${(imbalance * 100).toFixed(0)}% ${imbalance >= 0 ? '(mais bids)' : '(mais asks)'}`}
        valueClass={imbalance >= 0 ? 'text-term-green' : 'text-term-red'}
      />
      <div ref={ref} className="relative w-full mt-2">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          onMouseMove={(e) => setHoverX(e.clientX - e.currentTarget.getBoundingClientRect().left)}
          onMouseLeave={() => setHoverX(null)}
        >
          <path d={g.bidPath} fill="#00d964" fillOpacity={0.2} stroke="#00d964" strokeWidth={1.5} />
          <path d={g.askPath} fill="#ff3b30" fillOpacity={0.2} stroke="#ff3b30" strokeWidth={1.5} />
          <line x1={g.x(g.mid)} x2={g.x(g.mid)} y1={PAD.top} y2={height - PAD.bottom} stroke="#e5e5e5" strokeWidth={1} />
          {[g.mid - g.span, g.mid, g.mid + g.span].map((p, i) => (
            <text key={i} x={g.x(p)} y={height - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fontSize={9} fill="#7a7a7a">
              {fmtUsd(p)}
            </text>
          ))}
          {hover && hoverX != null && <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={height - PAD.bottom} stroke="#7a7a7a" strokeWidth={1} />}
        </svg>
        {hover && hoverX != null && (
          <div
            className="absolute pointer-events-none bg-term-panel2 border border-term-border px-2 py-1 text-[10px] z-10 whitespace-nowrap"
            style={{ left: Math.min(hoverX + 10, width - 150), top: PAD.top }}
          >
            <div className="font-semibold">{fmtUsd(hover.price)}</div>
            <div className="text-term-text">
              {hover.cum.toFixed(2)} BTC em {hover.side === 'bid' ? 'bids até aqui' : 'asks até aqui'}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 text-[10px] text-term-muted mt-1">
        <span>
          <span className="inline-block w-2 h-2 bg-term-green/60 mr-1" />
          Bids (compra){g.bidWall && ` · maior ordem ${g.bidWall[1].toFixed(2)} BTC @ ${fmtUsd(g.bidWall[0])}`}
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-term-red/60 mr-1" />
          Asks (venda){g.askWall && ` · maior ordem ${g.askWall[1].toFixed(2)} BTC @ ${fmtUsd(g.askWall[0])}`}
        </span>
      </div>
    </div>
  )
}
