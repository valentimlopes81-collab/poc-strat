import { useMemo, useState } from 'react'
import type { HistoryRow } from '../lib/history'
import { fmtInt, signed } from '../lib/levels'
import { LineChart, SERIES_COLORS, type LineSeries } from './LineChart'
import { Segmented } from './Panel'

type Asset = 'nq' | 'btc'
type Range = '3d' | '30d' | 'all'
const RANGE_S: Record<Range, number> = { '3d': 3 * 86400, '30d': 30 * 86400, all: Infinity }
const ZERO = [{ value: 0, label: 'flip de regime' }]
const fmtGex = (v: number) => `${signed(v)}B`

function pick(rows: HistoryRow[], get: (r: HistoryRow) => number | null | undefined) {
  const out: Array<{ time: number; value: number }> = []
  for (const r of rows) {
    const v = get(r)
    if (v != null && Number.isFinite(v)) out.push({ time: r.t, value: v })
  }
  return out
}

/** How total GEX and the key levels moved over the last days, next to price. */
export function LevelHistory({ rows }: { rows: HistoryRow[] }) {
  const [asset, setAsset] = useState<Asset>('nq')
  const [range, setRange] = useState<Range>('3d')

  const { gex, levels } = useMemo(() => {
    const cutoff = Date.now() / 1000 - RANGE_S[range]
    const win = rows.filter((r) => r.t >= cutoff)
    const gex: LineSeries[] = [{ label: 'GEX total', color: SERIES_COLORS[0], data: pick(win, (r) => r[asset]?.gex) }]
    const price = asset === 'nq' ? (r: HistoryRow) => r.nq?.q : (r: HistoryRow) => r.btc?.p
    const levels: LineSeries[] = [
      { label: asset === 'nq' ? 'Preço (QQQ)' : 'Preço', color: SERIES_COLORS[0], data: pick(win, price) },
      { label: 'Zero-gamma', color: SERIES_COLORS[1], data: pick(win, (r) => r[asset]?.zg) },
      { label: 'Call Wall', color: SERIES_COLORS[2], data: pick(win, (r) => r[asset]?.cw) },
      { label: 'Put Wall', color: SERIES_COLORS[3], data: pick(win, (r) => r[asset]?.pw) },
    ]
    return { gex, levels }
  }, [rows, asset, range])

  const points = gex[0].data.length
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <Segmented
          options={[
            { value: 'nq', label: 'NQ' },
            { value: 'btc', label: 'BTC' },
          ]}
          value={asset}
          onChange={setAsset}
        />
        <Segmented
          options={[
            { value: '3d', label: '3 dias' },
            { value: '30d', label: '30 dias' },
            { value: 'all', label: 'Tudo' },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>
      {points < 2 ? (
        <div className="text-[11px] text-term-muted py-6 text-center">Ainda sem leituras suficientes neste intervalo.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-term-muted mb-1">GEX total · acima de zero = pin, abaixo = amplifica</div>
            <LineChart series={gex} refLines={ZERO} format={fmtGex} height={190} intraday />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-term-muted mb-1">Preço vs níveis</div>
            <LineChart series={levels} format={asset === 'nq' ? (v) => v.toFixed(1) : (v) => fmtInt(v)} height={190} intraday />
          </div>
        </div>
      )}
      <p className="mt-1.5 text-[10px] text-term-muted">
        {points} leituras. O repositório guarda algumas por dia; cada atualização vista neste browser é acrescentada (guardada localmente 3 dias), por isso uma sessão
        aberta fica com resolução ao minuto.
      </p>
    </div>
  )
}
