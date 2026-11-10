import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp, LineStyle } from 'lightweight-charts'

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

export function PriceChart({ candles, levels, height }: { candles: Candle[]; levels: PriceLevel[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = createChart(ref.current, {
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
      autoSize: true,
    })
    const series = chart.addCandlestickSeries({
      upColor: '#00d964',
      downColor: '#ff3b30',
      borderUpColor: '#00d964',
      borderDownColor: '#ff3b30',
      wickUpColor: '#00d96499',
      wickDownColor: '#ff3b3099',
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => chart.remove()
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
  }, [candles])

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
    return () => {
      priceLines.forEach((pl) => series.removePriceLine(pl))
    }
  }, [levels])

  return <div ref={ref} className="w-full" style={{ height: height ?? 280 }} />
}
