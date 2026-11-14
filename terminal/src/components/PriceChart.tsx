import { useCallback, useEffect, useRef, useState } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp, LineStyle } from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'

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
  dashed?: boolean
}

export interface EconMarker {
  time: number
  label: string
  impact: 'High' | 'Medium'
}

interface ProfileBar {
  y: number
  h: number
  w: number // 0..1, share of max bucket volume
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
}

const PROFILE_BUCKETS = 28
const PROFILE_WIDTH_PCT = 22 // max width of a profile bar, % of chart width

// Killzones ICT (horas UTC, repete todos os dias) -- janelas convencionais
// amplamente citadas, nao uma definicao exata unica (variam +/-1h entre
// fontes), so para dar contexto visual de sessao, nunca um sinal.
const KILLZONES = [
  { label: 'Ásia', startH: 0, endH: 6, color: 'rgba(79,195,247,0.05)' },
  { label: 'Londres', startH: 7, endH: 10, color: 'rgba(255,159,28,0.06)' },
  { label: 'NY', startH: 12, endH: 15, color: 'rgba(0,217,100,0.05)' },
]
const DAY_S = 86400

export function PriceChart({
  candles,
  levels,
  height,
  volumeProfile = true,
  tradeMarkers,
  killzones = false,
  econEvents,
}: {
  candles: Candle[]
  levels: PriceLevel[]
  height?: number
  volumeProfile?: boolean
  tradeMarkers?: TradeMarker[]
  killzones?: boolean
  econEvents?: EconMarker[]
}) {
  const isFull = usePanelFullscreen()
  const effectiveHeight = isFull ? '52vh' : `${height ?? 280}px`
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartDivRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [profileBars, setProfileBars] = useState<ProfileBar[]>([])
  const [sessionBands, setSessionBands] = useState<SessionBand[]>([])
  const [eventMarks, setEventMarks] = useState<EventMark[]>([])

  const recomputeProfile = useCallback(() => {
    if (!seriesRef.current || !candles.length || !volumeProfile) {
      setProfileBars([])
      return
    }
    const highs = candles.map((c) => c.high)
    const lows = candles.map((c) => c.low)
    const maxP = Math.max(...highs)
    const minP = Math.min(...lows)
    if (!(maxP > minP)) return
    const bucketSize = (maxP - minP) / PROFILE_BUCKETS
    const vols = new Array(PROFILE_BUCKETS).fill(0)
    for (const c of candles) {
      const vol = c.volume ?? 0
      if (!vol) continue
      const loB = Math.max(0, Math.min(PROFILE_BUCKETS - 1, Math.floor((c.low - minP) / bucketSize)))
      const hiB = Math.max(0, Math.min(PROFILE_BUCKETS - 1, Math.floor((c.high - minP) / bucketSize)))
      const span = Math.max(1, hiB - loB + 1)
      for (let b = loB; b <= hiB; b++) vols[b] += vol / span
    }
    const maxVol = Math.max(...vols, 1)
    const bars: ProfileBar[] = []
    for (let b = 0; b < PROFILE_BUCKETS; b++) {
      if (vols[b] <= 0) continue
      const priceLo = minP + b * bucketSize
      const priceHi = priceLo + bucketSize
      const yHi = seriesRef.current.priceToCoordinate(priceHi)
      const yLo = seriesRef.current.priceToCoordinate(priceLo)
      if (yHi == null || yLo == null) continue
      bars.push({ y: Math.min(yHi, yLo), h: Math.max(1, Math.abs(yLo - yHi) - 1), w: vols[b] / maxVol })
    }
    setProfileBars(bars)
  }, [candles, volumeProfile])

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
          const startT = day + kz.startH * 3600
          const endT = day + kz.endH * 3600
          let x1 = toX(startT)
          let x2 = toX(endT)
          if (x1 == null && x2 == null) continue
          // start/end fora da janela visivel (banda corta um dos bordos do
          // grafico) -- start sempre < end no tempo, por isso se um dos
          // lados nao projeta, o outro diz de que lado ele ficou de fora
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

    if (econEvents && econEvents.length) {
      const raw: { x: number; label: string; impact: string }[] = []
      for (const e of econEvents) {
        const x = toX(e.time)
        if (x == null || x < 0 || x > chartW) continue
        raw.push({ x, label: e.label, impact: e.impact })
      }
      raw.sort((a, b) => a.x - b.x)
      // etiquetas perto umas das outras (ex.: dois releases a mesma hora)
      // ficam em linhas alternadas para nao sobrepor o texto
      const marks: EventMark[] = []
      let lastX = -Infinity
      let row = 0
      for (const r of raw) {
        row = r.x - lastX < 70 ? row + 1 : 0
        lastX = r.x
        marks.push({ ...r, row })
      }
      setEventMarks(marks)
    } else {
      setEventMarks([])
    }
  }, [candles, killzones, econEvents])

  useEffect(() => {
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
      rightPriceScale: { borderColor: '#242424' },
      timeScale: { borderColor: '#242424', timeVisible: true, secondsVisible: false },
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

    const handler = () => {
      recomputeProfile()
      recomputeOverlays()
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler)
    window.addEventListener('resize', handler)
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler)
      window.removeEventListener('resize', handler)
      chart.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !candles.length) return
    const data = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
    requestAnimationFrame(() => {
      recomputeProfile()
      recomputeOverlays()
    })
  }, [candles, recomputeProfile, recomputeOverlays])

  useEffect(() => {
    requestAnimationFrame(() => recomputeOverlays())
  }, [recomputeOverlays])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const priceLines = levels.map((lvl) =>
      series.createPriceLine({
        price: lvl.value,
        color: lvl.color,
        lineWidth: 1,
        lineStyle: lvl.dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
        title: lvl.title,
      })
    )
    requestAnimationFrame(() => recomputeProfile())
    return () => {
      priceLines.forEach((pl) => series.removePriceLine(pl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    if (!tradeMarkers || !tradeMarkers.length) {
      series.setMarkers([])
      return
    }
    const colorFor = { Win: '#00d964', Loss: '#ff3b30', BE: '#7a7a7a' } as const
    const shapeFor = { Win: 'arrowUp', Loss: 'arrowDown', BE: 'circle' } as const
    const markers = [...tradeMarkers]
      .sort((a, b) => a.time - b.time)
      .map((m) => ({
        time: m.time as UTCTimestamp,
        position: (m.result === 'Loss' ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
        color: colorFor[m.result],
        shape: shapeFor[m.result],
        text: m.label,
      }))
    series.setMarkers(markers)
  }, [tradeMarkers])

  const zoom = useCallback((factor: number) => {
    const ts = chartRef.current?.timeScale()
    const range = ts?.getVisibleLogicalRange()
    if (!ts || !range) return
    const center = (range.from + range.to) / 2
    const half = ((range.to - range.from) * factor) / 2
    ts.setVisibleLogicalRange({ from: center - half, to: center + half })
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: effectiveHeight }}>
      <div ref={chartDivRef} className="absolute inset-0" />
      <div className="absolute top-0 right-[58px] z-[60] flex gap-0.5">
        <button
          onClick={() => zoom(0.7)}
          className="w-5 h-5 flex items-center justify-center bg-term-panel2 border border-term-border text-term-muted hover:text-term-amber hover:border-term-amber text-[11px] leading-none"
          title="Aproximar"
        >
          +
        </button>
        <button
          onClick={() => zoom(1.4)}
          className="w-5 h-5 flex items-center justify-center bg-term-panel2 border border-term-border text-term-muted hover:text-term-amber hover:border-term-amber text-[11px] leading-none"
          title="Afastar"
        >
          −
        </button>
        <button
          onClick={() => chartRef.current?.timeScale().fitContent()}
          className="w-5 h-5 flex items-center justify-center bg-term-panel2 border border-term-border text-term-muted hover:text-term-amber hover:border-term-amber text-[9px] leading-none"
          title="Repor zoom"
        >
          ⟲
        </button>
      </div>
      {sessionBands.map((b, i) => (
        <div
          key={i}
          className="absolute inset-y-0 pointer-events-none z-30 border-l border-r border-white/[0.03]"
          style={{ left: b.x, width: Math.max(1, b.w), background: b.color }}
          title={b.label}
        >
          <span className="absolute top-0 left-0.5 text-[8px] uppercase tracking-wide text-term-muted/70">{b.label}</span>
        </div>
      ))}
      {eventMarks.map((m, i) => (
        <div
          key={i}
          className="absolute inset-y-0 pointer-events-none z-40 border-l border-dashed"
          style={{ left: m.x, borderColor: m.impact === 'High' ? '#ff3b30' : '#ff9f1c' }}
        >
          <span
            className="absolute left-1 text-[8px] whitespace-nowrap px-0.5 bg-black/40"
            style={{ color: m.impact === 'High' ? '#ff3b30' : '#ff9f1c', bottom: 16 + m.row * 11 }}
          >
            {m.label}
          </span>
        </div>
      ))}
      {volumeProfile && profileBars.length > 0 && (
        <div
          className="absolute inset-y-0 right-[58px] pointer-events-none z-50"
          style={{ width: `${PROFILE_WIDTH_PCT}%` }}
        >
          {profileBars.map((b, i) => (
            <div
              key={i}
              className="absolute right-0 bg-term-blue/25"
              style={{ top: b.y, height: b.h, width: `${Math.max(2, b.w * 100)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
