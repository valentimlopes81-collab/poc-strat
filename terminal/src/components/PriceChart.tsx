import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  createChart,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import { fmtLocalDay, fmtLocalFull, fmtLocalMonth, fmtLocalTime, nyHourToEpoch } from '../lib/time'

export interface TradeMarker {
  time: number
  result: 'Win' | 'Loss' | 'BE'
  label: string
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
  calls_volume?: number
  puts_volume?: number
}

export interface PriceLevel {
  value: number
  color: string
  title: string
  style?: 'solid' | 'dashed' | 'dotted'
}

export interface EconMarker {
  time: number
  label: string
  impact: 'High' | 'Medium'
}

interface SessionBand {
  x: number
  w: number
  label: string
  color: string
}

interface EventMark {
  x: number
  label: string
  impact: string
  row: number
  /** label goes to the left of its line because there is no room on the right */
  flip: boolean
}

// Killzones ICT, em hora de Nova Iorque (acompanham a mudança de hora dos
// EUA). No inverno correspondem a 00-06 / 07-10 / 12-15 UTC. Janelas
// convencionais, variam +/-1h entre fontes: contexto visual, nunca um sinal.
const KILLZONES = [
  { label: 'Ásia', startH: 19, endH: 25, color: 'rgba(79,195,247,0.05)' },
  { label: 'Londres', startH: 2, endH: 5, color: 'rgba(255,159,28,0.06)' },
  { label: 'NY', startH: 7, endH: 10, color: 'rgba(0,217,100,0.05)' },
]
const DAY_S = 86400
const LINE_STYLE = { solid: LineStyle.Solid, dashed: LineStyle.Dashed, dotted: LineStyle.Dotted }
/** fixed width of the right price axis, shared with the panes stacked under the chart so their bars line up */
export const AXIS_WIDTH = 68

const asEpoch = (t: Time) => (typeof t === 'number' ? t : 0)

export function PriceChart({
  candles,
  levels,
  viewKey,
  defaultBars = 200,
  height,
  tradeMarkers,
  killzones = false,
  econEvents,
  precision = 2,
  live,
  onChartApi,
}: {
  candles: Candle[]
  levels: PriceLevel[]
  /** changes when the dataset is a different one (symbol/timeframe), which resets the view */
  viewKey: string
  /** how many of the latest bars the default view shows */
  defaultBars?: number
  height?: number
  tradeMarkers?: TradeMarker[]
  killzones?: boolean
  econEvents?: EconMarker[]
  precision?: number
  /** latest traded price from a streaming feed; moves the last bar between refreshes of `candles` */
  live?: { price: number; barSeconds: number }
  onChartApi?: (chart: IChartApi) => void
}) {
  const isFull = usePanelFullscreen()
  const effectiveHeight = isFull ? '52vh' : `${height ?? 280}px`
  const chartDivRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [sessionBands, setSessionBands] = useState<SessionBand[]>([])
  const [eventMarks, setEventMarks] = useState<EventMark[]>([])
  const view = useRef({ key: '', len: 0 })

  const recomputeOverlays = useCallback(() => {
    const chart = chartRef.current
    const chartW = chartDivRef.current?.clientWidth ?? 0
    if (!chart || !candles.length || !chartW) {
      setSessionBands([])
      setEventMarks([])
      return
    }
    const ts = chart.timeScale()
    const toX = (t: number): number | null => {
      const c = ts.timeToCoordinate(t as UTCTimestamp)
      return c == null ? null : Number(c)
    }

    if (killzones) {
      const firstDay = Math.floor(candles[0].time / DAY_S) * DAY_S
      const lastDay = Math.floor(candles[candles.length - 1].time / DAY_S) * DAY_S
      const bands: SessionBand[] = []
      for (let day = firstDay - DAY_S; day <= lastDay + DAY_S; day += DAY_S) {
        for (const kz of KILLZONES) {
          let x1 = toX(nyHourToEpoch(day, kz.startH))
          let x2 = toX(nyHourToEpoch(day, kz.endH))
          if (x1 == null && x2 == null) continue
          // one edge outside the visible window: the band is cut by that side of the chart
          if (x1 == null) x1 = 0
          if (x2 == null) x2 = chartW
          const lo = Math.max(0, Math.min(x1, x2))
          const hi = Math.min(chartW, Math.max(x1, x2))
          if (hi <= lo) continue
          bands.push({ x: lo, w: hi - lo, label: kz.label, color: kz.color })
        }
      }
      setSessionBands(bands)
    } else {
      setSessionBands([])
    }

    if (econEvents?.length) {
      const raw: { x: number; label: string; impact: string }[] = []
      for (const e of econEvents) {
        const x = toX(e.time)
        if (x == null || x < 0 || x > chartW) continue
        raw.push({ x, label: e.label, impact: e.impact })
      }
      raw.sort((a, b) => a.x - b.x)
      // labels close together (two releases at the same time) alternate rows so the text does not overlap
      const marks: EventMark[] = []
      let lastX = -Infinity
      let row = 0
      for (const r of raw) {
        row = r.x - lastX < 70 ? row + 1 : 0
        lastX = r.x
        marks.push({ ...r, row, flip: r.x > chartW - AXIS_WIDTH - 130 })
      }
      setEventMarks(marks)
    } else {
      setEventMarks([])
    }
  }, [candles, killzones, econEvents])

  // the chart subscribes once; it must always call the latest closure
  const recomputeRef = useRef(recomputeOverlays)
  useEffect(() => {
    recomputeRef.current = recomputeOverlays
    requestAnimationFrame(recomputeOverlays)
  }, [recomputeOverlays])

  // layout effect: teardown must run before React detaches the node, or the chart's own resize observer queues a paint on a disposed chart
  useLayoutEffect(() => {
    if (!chartDivRef.current) return
    const chart = createChart(chartDivRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#7a7a7a',
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      rightPriceScale: { borderColor: '#242424', minimumWidth: AXIS_WIDTH },
      // the library renders timestamps as UTC; show the viewer's local time instead
      localization: { timeFormatter: (t: Time) => fmtLocalFull(asEpoch(t)) },
      timeScale: {
        borderColor: '#242424',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (t: Time, type: TickMarkType) => {
          const e = asEpoch(t)
          if (type === TickMarkType.Year) return String(new Date(e * 1000).getFullYear())
          if (type === TickMarkType.Month) return fmtLocalMonth(e)
          if (type === TickMarkType.DayOfMonth) return fmtLocalDay(e)
          return fmtLocalTime(e)
        },
      },
      crosshair: {
        vertLine: { color: '#ff9f1c', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#ff9f1c' },
        horzLine: { color: '#ff9f1c', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#ff9f1c' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
      autoSize: true,
    })
    const series = chart.addCandlestickSeries({
      upColor: '#636363',
      downColor: '#000000',
      borderUpColor: '#636363',
      borderDownColor: '#4a4a4a',
      wickUpColor: '#636363',
      wickDownColor: '#4a4a4a',
    })
    chartRef.current = chart
    seriesRef.current = series
    onChartApi?.(chart)

    const handler = () => recomputeRef.current()
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler)
    window.addEventListener('resize', handler)
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler)
      window.removeEventListener('resize', handler)
      // a queued animation frame may still run after this: with the refs cleared it becomes a no-op
      chartRef.current = null
      seriesRef.current = null
      chart.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    seriesRef.current?.applyOptions({ priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision } })
  }, [precision])

  const resetView = useCallback(() => {
    const len = view.current.len
    chartRef.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, len - defaultBars) - 0.5, to: len + 4 })
  }, [defaultBars])

  useEffect(() => {
    const series = seriesRef.current
    const ts = chartRef.current?.timeScale()
    if (!series || !ts || !candles.length) return
    const prev = view.current
    const range = ts.getVisibleLogicalRange()
    series.setData(
      candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })),
    )
    const len = candles.length
    view.current = { key: viewKey, len }
    if (prev.key !== viewKey || !range) {
      resetView()
    } else {
      // a refresh of the same dataset keeps the user's zoom/pan; if they were
      // looking at the latest bar the window follows the new ones
      const added = len - prev.len
      const atEdge = range.to >= prev.len - 2
      ts.setVisibleLogicalRange(atEdge && added > 0 ? { from: range.from + added, to: range.to + added } : range)
    }
    requestAnimationFrame(() => recomputeRef.current())
  }, [candles, viewKey, resetView])

  const liveBar = useRef<{ time: number; open: number; high: number; low: number } | null>(null)
  useEffect(() => {
    liveBar.current = null
  }, [candles])

  const livePrice = live?.price
  const barSeconds = live?.barSeconds
  useEffect(() => {
    const series = seriesRef.current
    const last = candles[candles.length - 1]
    if (!series || !last || livePrice == null || !barSeconds) return
    const bucket = Math.floor(Date.now() / 1000 / barSeconds) * barSeconds
    let bar = liveBar.current
    if (!bar || bar.time < bucket) {
      // continue the last bar from the server, or open the next one if its interval has ended
      bar = bucket > last.time ? { time: bucket, open: livePrice, high: livePrice, low: livePrice } : { time: last.time, open: last.open, high: last.high, low: last.low }
    }
    bar.high = Math.max(bar.high, livePrice)
    bar.low = Math.min(bar.low, livePrice)
    liveBar.current = bar
    series.update({ time: bar.time as UTCTimestamp, open: bar.open, high: bar.high, low: bar.low, close: livePrice })
  }, [livePrice, barSeconds, candles])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const priceLines = levels.map((lvl) =>
      series.createPriceLine({
        price: lvl.value,
        color: lvl.color,
        lineWidth: 1,
        lineStyle: LINE_STYLE[lvl.style ?? 'solid'],
        axisLabelVisible: true,
        title: lvl.title,
      }),
    )
    return () => {
      // on unmount the chart is already gone; touching its series would queue a paint on a disposed chart
      if (seriesRef.current === series) priceLines.forEach((pl) => series.removePriceLine(pl))
    }
  }, [levels])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    if (!tradeMarkers?.length) {
      series.setMarkers([])
      return
    }
    const colorFor = { Win: '#00d964', Loss: '#ff3b30', BE: '#7a7a7a' } as const
    const shapeFor = { Win: 'arrowUp', Loss: 'arrowDown', BE: 'circle' } as const
    series.setMarkers(
      [...tradeMarkers]
        .sort((a, b) => a.time - b.time)
        .map((m) => ({
          time: m.time as UTCTimestamp,
          position: (m.result === 'Loss' ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
          color: colorFor[m.result],
          shape: shapeFor[m.result],
          text: m.label,
        })),
    )
  }, [tradeMarkers, candles])

  const zoom = useCallback((factor: number) => {
    const ts = chartRef.current?.timeScale()
    const range = ts?.getVisibleLogicalRange()
    if (!ts || !range) return
    const center = (range.from + range.to) / 2
    const half = ((range.to - range.from) * factor) / 2
    ts.setVisibleLogicalRange({ from: center - half, to: center + half })
  }, [])

  const btn =
    'w-5 h-5 flex items-center justify-center bg-term-panel2 border border-term-border text-term-muted hover:text-term-amber hover:border-term-amber leading-none'

  return (
    <div className="relative w-full overflow-hidden" style={{ height: effectiveHeight }}>
      <div ref={chartDivRef} className="absolute inset-0" />
      <div className="absolute top-0 left-0 z-[60] flex gap-0.5">
        <button onClick={() => zoom(0.7)} className={`${btn} text-[11px]`} title="Aproximar">
          +
        </button>
        <button onClick={() => zoom(1.4)} className={`${btn} text-[11px]`} title="Afastar">
          −
        </button>
        <button onClick={resetView} className={`${btn} text-[9px]`} title="Repor zoom">
          ⟲
        </button>
      </div>
      {sessionBands.map((b, i) => (
        <div
          key={i}
          className="absolute inset-y-0 pointer-events-none z-30 border-l border-r border-white/[0.03]"
          style={{ left: b.x, width: Math.max(1, b.w), background: b.color }}
        >
          {/* the zoom buttons occupy the top-left corner */}
          <span className={`absolute left-0.5 text-[8px] uppercase tracking-wide text-term-muted/70 ${b.x < 70 ? 'top-[22px]' : 'top-0'}`}>{b.label}</span>
        </div>
      ))}
      {eventMarks.map((m, i) => (
        <div
          key={i}
          className="absolute inset-y-0 pointer-events-none z-40 border-l border-dashed"
          style={{ left: m.x, borderColor: m.impact === 'High' ? '#ff3b30' : '#ff9f1c' }}
        >
          <span
            className={`absolute text-[8px] whitespace-nowrap px-0.5 bg-black/40 ${m.flip ? 'right-1' : 'left-1'}`}
            style={{ color: m.impact === 'High' ? '#ff3b30' : '#ff9f1c', bottom: 16 + m.row * 11 }}
          >
            {m.label}
          </span>
        </div>
      ))}
    </div>
  )
}
