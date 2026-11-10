import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, LineStyle } from 'lightweight-charts'
import type { TradeRow } from '../types'

export function EquityChart({ trades }: { trades: TradeRow[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

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
      timeScale: { borderColor: '#242424', visible: false },
      crosshair: {
        vertLine: { color: '#ff9f1c', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#ff9f1c' },
        horzLine: { color: '#ff9f1c', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#ff9f1c' },
      },
      autoSize: true,
    })
    const series = chart.addAreaSeries({
      lineColor: '#ff9f1c',
      topColor: 'rgba(255,159,28,0.28)',
      bottomColor: 'rgba(255,159,28,0.0)',
      lineWidth: 2,
      priceLineColor: '#ff9f1c',
      priceLineStyle: LineStyle.Dotted,
      crosshairMarkerBorderColor: '#ff9f1c',
      crosshairMarkerBackgroundColor: '#000000',
      priceFormat: { type: 'custom', formatter: (p: number) => (p < 0 ? '-$' : '$') + Math.abs(p).toFixed(0) },
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => chart.remove()
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !trades.length) return
    let running = 0
    const data = trades.map((t, i) => {
      running += Number(t.pnl_usd) || 0
      return { time: i + 1, value: running }
    })
    // lightweight-charts wants unique increasing time; numeric index as business-day-like works via whitespace times
    seriesRef.current.setData(data as never)
    chartRef.current?.timeScale().fitContent()
  }, [trades])

  return <div ref={ref} className="w-full" style={{ height: 220 }} />
}
