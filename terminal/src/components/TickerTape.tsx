import type { LevelRow, CotRow } from '../types'
import { fmtAgo } from '../lib/useJson'

function rowOf(levels: LevelRow[] | null, asset: 'NQ' | 'BTC') {
  return levels?.find((r) => r.asset === asset) ?? null
}

export function TickerTape({ levels, cot }: { levels: LevelRow[] | null; cot: CotRow[] | null }) {
  const nq = rowOf(levels, 'NQ')
  const btc = rowOf(levels, 'BTC')
  const cotRow = cot?.[0] ?? null

  return (
    <div className="flex flex-wrap items-center gap-5 text-[12px] tabular-nums overflow-x-auto whitespace-nowrap py-1">
      {nq && (
        <span>
          <span className="text-term-muted mr-1.5">NQ</span>
          <span className="font-semibold">{nq.price_ref}</span>{' '}
          <span className={nq.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'}>
            GEX {nq.gex_total_b >= 0 ? '+' : ''}
            {nq.gex_total_b.toFixed(2)}B
          </span>
        </span>
      )}
      {btc && (
        <span>
          <span className="text-term-muted mr-1.5">BTC</span>
          <span className="font-semibold">${Math.round(btc.price).toLocaleString('en-US')}</span>{' '}
          <span className={btc.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'}>
            GEX {btc.gex_total_b >= 0 ? '+' : ''}
            {btc.gex_total_b.toFixed(3)}B
          </span>
        </span>
      )}
      {nq?.vix != null && (
        <span>
          <span className="text-term-muted mr-1.5">VIX</span>
          <span className={(nq.vix_change_pct ?? 0) >= 0 ? 'text-term-red' : 'text-term-green'}>{nq.vix.toFixed(2)}</span>
        </span>
      )}
      {cotRow && (
        <span>
          <span className="text-term-muted mr-1.5">COT NQ</span>
          <span className={cotRow.lf_net >= 0 ? 'text-term-green' : 'text-term-red'}>
            {cotRow.lf_net >= 0 ? '+' : ''}
            {cotRow.lf_net.toLocaleString('en-US')}
          </span>
        </span>
      )}
      {nq && <span className="text-term-muted text-[10px]">· atualizado {fmtAgo(nq.as_of_utc)}</span>}
    </div>
  )
}
