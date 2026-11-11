import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp, LineStyle } from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'

export function VixChart({ data, height }: { data: Array<{ time: number; value: number }>; height?: number }) {
  const isFull = usePanelFullscreen()
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

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
      grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      rightPriceScale: { borderColor: '#242424' },
      timeScale: { borderColor: '#242424', timeVisible: false },
      crosshair: {
        vertLine: { color: '#4fc3f7', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#4fc3f7' },
        horzLine: { color: '#4fc3f7', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#4fc3f7' },
      },
      autoSize: true,
    })
    const series = chart.addLineSeries({
      color: '#4fc3f7',
      lineWidth: 2,
      priceLineVisible: true,
      priceLineStyle: LineStyle.Dotted,
      crosshairMarkerBorderColor: '#4fc3f7',
      crosshairMarkerBackgroundColor: '#000000',
    })
    // reference bands: 15 (baixo), 20 (normal/elevado), 30 (stress)
    series.createPriceLine({ price: 20, color: '#7a7a7a55', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
    series.createPriceLine({ price: 30, color: '#ff3b3055', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
    chartRef.current = chart
    seriesRef.current = series
    return () => chart.remove()
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !data.length) return
    seriesRef.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })))
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return <div ref={ref} className="w-full" style={{ height: isFull ? '65vh' : height ?? 120 }} />
}
