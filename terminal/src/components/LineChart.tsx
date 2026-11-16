import { useEffect, useLayoutEffect, useRef } from 'react'
import { createChart, LineStyle, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'

export interface LineSeries {
  label: string
  color: string
  data: Array<{ time: number; value: number }>
}

export interface RefLine {
  value: number
  label: string
  color?: string
}

/** Categorical series colours, validated for colour-blind separation on the terminal's dark surface. Use in this order. */
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500'] as const

/** Daily time series sharing one value axis, with a legend carrying each series' latest value. */
export function LineChart({
  series,
  refLines = [],
  height = 180,
  format = (v) => v.toFixed(2),
}: {
  series: LineSeries[]
  refLines?: RefLine[]
  height?: number
  format?: (v: number) => string
}) {
  const isFull = usePanelFullscreen()
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const lines = useRef<ISeriesApi<'Line'>[]>([])

  // layout effect: teardown must run before React detaches the node, or the chart's own resize observer queues a paint on a disposed chart
  useLayoutEffect(() => {
    if (!ref.current) return
    const chart = createChart(ref.current, {
      layout: { background: { color: '#0a0a0a' }, textColor: '#7a7a7a', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 10, attributionLogo: false },
      grid: { vertLines: { color: '#141414' }, horzLines: { color: '#1a1a1a' } },
      rightPriceScale: { borderColor: '#242424' },
      timeScale: { borderColor: '#242424', timeVisible: false },
      crosshair: {
        vertLine: { color: '#7a7a7a', width: 1, style: LineStyle.Solid, labelBackgroundColor: '#3a3a3a' },
        horzLine: { color: '#7a7a7a', width: 1, style: LineStyle.Solid, labelBackgroundColor: '#3a3a3a' },
      },
      autoSize: true,
    })
    chartRef.current = chart
    return () => {
      chartRef.current = null
      lines.current = []
      chart.remove()
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const created = series.map((s, i) => {
      const line = chart.addLineSeries({
        color: s.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerBorderColor: '#0a0a0a',
        crosshairMarkerBackgroundColor: s.color,
        priceFormat: { type: 'custom', formatter: format, minMove: 0.01 },
      })
      line.setData(s.data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })))
      if (i === 0) {
        for (const r of refLines) {
          line.createPriceLine({ price: r.value, color: r.color ?? '#7a7a7a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: r.label })
        }
      }
      return line
    })
    lines.current = created
    chart.timeScale().fitContent()
    return () => {
      if (chartRef.current === chart) created.forEach((l) => chart.removeSeries(l))
    }
    // the formatter is expected to be stable; re-creating series on every render would reset the view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, refLines])

  return (
    <div>
      <div ref={ref} className="w-full" style={{ height: isFull ? '60vh' : height }} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-term-muted mt-1">
        {series.map((s) => {
          const last = s.data.at(-1)?.value
          return (
            <span key={s.label}>
              <span className="inline-block w-3 h-0.5 align-middle mr-1" style={{ background: s.color }} />
              {s.label}
              {last != null && <span className="text-term-text ml-1 tabular-nums">{format(last)}</span>}
            </span>
          )
        })}
        {refLines.map((r) => (
          <span key={r.label}>
            <span className="inline-block w-3 border-t border-dashed align-middle mr-1" style={{ borderColor: r.color ?? '#7a7a7a' }} />
            {r.label} <span className="text-term-text ml-1 tabular-nums">{format(r.value)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
