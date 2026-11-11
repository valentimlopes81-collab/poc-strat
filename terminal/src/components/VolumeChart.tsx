import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'

export interface VolumeBar {
  time: number
  value: number
  color: string
}

export function VolumeChart({ data, height }: { data: VolumeBar[]; height?: number }) {
  const isFull = usePanelFullscreen()
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = createChart(ref.current, {
      layout: { background: { color: '#0a0a0a' }, textColor: '#7a7a7a', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 9, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: '#1a1a1a' } },
      rightPriceScale: { borderColor: '#242424' },
      timeScale: { borderColor: '#242424', timeVisible: true, secondsVisible: false },
      autoSize: true,
    })
    const series = chart.addHistogramSeries({ priceFormat: { type: 'volume' } })
    chartRef.current = chart
    seriesRef.current = series
    return () => chart.remove()
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !data.length) return
    seriesRef.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value, color: d.color })))
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return <div ref={ref} className="w-full" style={{ height: isFull ? 140 : height ?? 70 }} />
}
