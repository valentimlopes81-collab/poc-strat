import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp, LineStyle } from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import type { VolCompareData } from '../types'

export function VolCompare({ data }: { data: VolCompareData }) {
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
      priceLineVisible: false,
      crosshairMarkerBorderColor: '#4fc3f7',
      crosshairMarkerBackgroundColor: '#000000',
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => chart.remove()
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !data.realized.length) return
    seriesRef.current.setData(data.realized.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })))
    if (data.implied_atm_now) {
      seriesRef.current.createPriceLine({
        price: data.implied_atm_now.atm_iv,
        color: '#ff9f1c',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Implied ${data.implied_atm_now.dte}d`,
      })
    }
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return (
    <div>
      <div ref={ref} className="w-full" style={{ height: isFull ? '65vh' : 160 }} />
      <p className="mt-1 text-[10px] text-term-muted">
        Azul: vol realizada 20d (do preço real). Laranja: IV implied ~30d atual. Implied acima do realizado = opções mais caras que o movimento recente justificaria.
      </p>
    </div>
  )
}
