import { useMemo, useState } from 'react'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import type { Trade } from '../lib/kraken'
import { fmtLocalTime } from '../lib/time'
import { useWidth } from '../lib/useWidth'

const PAD = { top: 8, right: 44, bottom: 18, left: 8 }
const BUCKET_MS = 15_000
const WINDOWS = [
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '15 min', ms: 15 * 60_000 },
]

/**
 * Cumulative volume delta (market buys minus market sells) over the recent
 * trade tape, plus the buy/sell split of the last minutes and the largest
 * prints.
 */
export function TradeFlow({ trades }: { trades: Trade[] }) {
  const isFull = usePanelFullscreen()
  const [ref, width] = useWidth<HTMLDivElement>(480)
  const [hoverI, setHoverI] = useState<number | null>(null)
  const height = isFull ? 320 : 150

  const series = useMemo(() => {
    const pts: Array<{ t: number; cvd: number }> = []
    let cvd = 0
    for (const tr of trades) {
      cvd += tr.side === 'buy' ? tr.qty : -tr.qty
      const bucket = Math.floor(tr.t / BUCKET_MS) * BUCKET_MS
      const last = pts[pts.length - 1]
      if (last && last.t === bucket) last.cvd = cvd
      else pts.push({ t: bucket, cvd })
    }
    return pts
  }, [trades])

  const now = trades.length ? trades[trades.length - 1].t : 0
  const windows = useMemo(
    () =>
      WINDOWS.map((w) => {
        let buy = 0
        let sell = 0
        for (let i = trades.length - 1; i >= 0 && trades[i].t >= now - w.ms; i--) {
          if (trades[i].side === 'buy') buy += trades[i].qty
          else sell += trades[i].qty
        }
        // a window longer than the tape would understate itself
        return { ...w, buy, sell, covered: trades.length > 0 && trades[0].t <= now - w.ms }
      }),
    [trades, now],
  )
  const biggest = useMemo(() => [...trades.filter((t) => t.t >= now - 15 * 60_000)].sort((a, b) => b.qty - a.qty).slice(0, 5), [trades, now])

  if (series.length < 2) return <div className="text-[11px] text-term-muted py-6 text-center">A ligar ao fluxo de trades…</div>

  const t0 = series[0].t
  const t1 = series[series.length - 1].t
  const yAbs = Math.max(...series.map((p) => Math.abs(p.cvd)), 1e-9)
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * (width - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + ((yAbs - v) / (2 * yAbs)) * (height - PAD.top - PAD.bottom)
  const path = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.cvd).toFixed(1)}`).join('')
  const last = series[series.length - 1]
  const hover = hoverI != null ? series[hoverI] : null
  const maxWin = Math.max(...windows.map((w) => Math.max(w.buy, w.sell)), 1e-9)

  return (
    <div>
      <div ref={ref} className="relative w-full">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          onMouseMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left
            let best = 0
            for (let i = 1; i < series.length; i++) if (Math.abs(x(series[i].t) - px) < Math.abs(x(series[best].t) - px)) best = i
            setHoverI(best)
          }}
          onMouseLeave={() => setHoverI(null)}
        >
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="#3a3a3a" strokeWidth={1} />
          <path d={path} fill="none" stroke="#ff9f1c" strokeWidth={2} />
          <circle cx={x(last.t)} cy={y(last.cvd)} r={4} fill="#ff9f1c" stroke="#0a0a0a" strokeWidth={2} />
          <text x={width - PAD.right + 6} y={y(last.cvd) + 3} fontSize={10} fontWeight={700} fill="#e5e5e5">
            {last.cvd >= 0 ? '+' : ''}
            {last.cvd.toFixed(1)}
          </text>
          <text x={PAD.left} y={height - 5} fontSize={9} fill="#7a7a7a">
            {fmtLocalTime(t0 / 1000)}
          </text>
          <text x={width - PAD.right} y={height - 5} fontSize={9} fill="#7a7a7a" textAnchor="end">
            {fmtLocalTime(t1 / 1000)}
          </text>
          {hover && (
            <>
              <line x1={x(hover.t)} x2={x(hover.t)} y1={PAD.top} y2={height - PAD.bottom} stroke="#7a7a7a" strokeWidth={1} />
              <circle cx={x(hover.t)} cy={y(hover.cvd)} r={4} fill="#ff9f1c" stroke="#0a0a0a" strokeWidth={2} />
            </>
          )}
        </svg>
        {hover && (
          <div
            className="absolute pointer-events-none bg-term-panel2 border border-term-border px-2 py-1 text-[10px] z-10 whitespace-nowrap"
            style={{ left: Math.min(x(hover.t) + 10, width - 140), top: PAD.top }}
          >
            <div className="text-term-muted">{fmtLocalTime(hover.t / 1000)}</div>
            <div className="font-semibold">
              CVD {hover.cvd >= 0 ? '+' : ''}
              {hover.cvd.toFixed(2)} BTC
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {windows.map((w) => {
          const net = w.buy - w.sell
          return (
            <div key={w.label} className="flex items-center gap-1.5 text-[10px] tabular-nums">
              <span className="w-12 text-term-muted">{w.label}</span>
              <div className="flex-1 h-2.5 flex justify-end bg-black/40">
                <div className="h-full bg-term-red" style={{ width: `${(w.sell / maxWin) * 100}%` }} />
              </div>
              <div className="flex-1 h-2.5 bg-black/40">
                <div className="h-full bg-term-green" style={{ width: `${(w.buy / maxWin) * 100}%` }} />
              </div>
              <span className="w-[86px] text-right text-term-text">
                {net >= 0 ? '+' : ''}
                {net.toFixed(2)} BTC{w.covered ? '' : '*'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-term-muted mt-1">
        <span>
          <span className="inline-block w-2 h-2 bg-term-red mr-1" />
          vendas a mercado
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-term-green mr-1" />
          compras a mercado
        </span>
        {windows.some((w) => !w.covered) && <span>* janela maior que o histórico carregado</span>}
      </div>

      {biggest.length > 0 && (
        <div className="mt-2 pt-2 border-t border-term-border">
          <div className="text-[10px] uppercase tracking-wide text-term-muted mb-1">Maiores trades · últimos 15 min</div>
          {biggest.map((t, i) => (
            <div key={i} className="flex justify-between text-[11px] tabular-nums py-px">
              <span className="text-term-muted">{fmtLocalTime(t.t / 1000)}</span>
              <span className={t.side === 'buy' ? 'text-term-green' : 'text-term-red'}>{t.side === 'buy' ? 'COMPRA' : 'VENDA'}</span>
              <span>{t.qty.toFixed(3)} BTC</span>
              <span className="text-term-muted">${t.price.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
