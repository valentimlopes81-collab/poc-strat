import { useCallback, useEffect, useRef, useState } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp, LineStyle } from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'

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

interface ProfileBar {
  y: number
  h: number
  w: number // 0..1, share of max bucket volume
}

const PROFILE_BUCKETS = 28
const PROFILE_WIDTH_PCT = 22 // max width of a profile bar, % of chart width

export function PriceChart({
  candles,
  levels,
  height,
  volumeProfile = true,
}: {
  candles: Candle[]
  levels: PriceLevel[]
  height?: number
  volumeProfile?: boolean
}) {
  const isFull = usePanelFullscreen()
  const effectiveHeight = isFull ? '52vh' : `${height ?? 280}px`
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartDivRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [profileBars, setProfileBars] = useState<ProfileBar[]>([])

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

    const handler = () => recomputeProfile()
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
    requestAnimationFrame(() => recomputeProfile())
  }, [candles, recomputeProfile])

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
      <div className="absolute top-0 right-0 z-[60] flex gap-0.5">
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
