import { useEffect, useLayoutEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type LogicalRange, type MouseEventParams, type UTCTimestamp } from 'lightweight-charts'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import { AXIS_WIDTH } from './PriceChart'

export interface VolumeBar {
  time: number
  /** null leaves a gap at this bar while keeping the time grid aligned */
  value: number | null
  color?: string
}

// A histogram pane that follows a master price chart: same visible range and
// crosshair, no scrolling of its own. `data` must have one entry per master
// candle (use value: null for gaps) so both charts share the same bar index.
export function VolumeChart({ data, height, syncWith }: { data: VolumeBar[]; height?: number; syncWith: IChartApi | null }) {
  const isFull = usePanelFullscreen()
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const valueAt = useRef(new Map<number, number>())

  // layout effect: teardown must run before React detaches the node, or the chart's own resize observer queues a paint on a disposed chart
  useLayoutEffect(() => {
    if (!ref.current) return
    const chart = createChart(ref.current, {
      layout: { background: { color: '#0a0a0a' }, textColor: '#7a7a7a', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 9, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: '#1a1a1a' } },
      rightPriceScale: { borderColor: '#242424', minimumWidth: AXIS_WIDTH },
      timeScale: { visible: false },
      crosshair: { horzLine: { visible: false, labelVisible: false }, vertLine: { color: '#ff9f1c', width: 1, labelVisible: false } },
      handleScroll: false,
      handleScale: false,
      autoSize: true,
    })
    const series = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceLineVisible: false })
    chartRef.current = chart
    seriesRef.current = series
    return () => {
      chartRef.current = null
      seriesRef.current = null
      chart.remove()
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    valueAt.current = new Map(data.filter((d) => d.value != null).map((d) => [d.time, d.value as number]))
    seriesRef.current.setData(
      data.map((d) => (d.value == null ? { time: d.time as UTCTimestamp } : { time: d.time as UTCTimestamp, value: d.value, color: d.color })),
    )
  }, [data])

  useEffect(() => {
    const own = chartRef.current
    const series = seriesRef.current
    if (!own || !series || !syncWith) return
    const masterScale = syncWith.timeScale()
    const applyRange = (range: LogicalRange | null) => {
      if (range) own.timeScale().setVisibleLogicalRange(range)
    }
    const onRange = () => applyRange(masterScale.getVisibleLogicalRange())
    const onCrosshair = (p: MouseEventParams) => {
      const t = typeof p.time === 'number' ? p.time : null
      if (t == null) own.clearCrosshairPosition()
      else own.setCrosshairPosition(valueAt.current.get(t) ?? 0, t as UTCTimestamp, series)
    }
    onRange()
    masterScale.subscribeVisibleLogicalRangeChange(onRange)
    syncWith.subscribeCrosshairMove(onCrosshair)
    return () => {
      // on unmount the master chart is torn down first, and a disposed chart throws on any call
      try {
        masterScale.unsubscribeVisibleLogicalRangeChange(onRange)
        syncWith.unsubscribeCrosshairMove(onCrosshair)
      } catch {
        // master already removed: its subscriptions went with it
      }
    }
  }, [syncWith, data])

  return <div ref={ref} className="w-full" style={{ height: isFull ? 120 : (height ?? 56) }} />
}
