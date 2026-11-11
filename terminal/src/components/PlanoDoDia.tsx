import type { LevelRow } from '../types'
import { fmtAgo } from '../lib/useJson'

function AssetPlan({ row }: { row: LevelRow }) {
  const tone = row.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'
  const borderTone = row.gex_total_b >= 0 ? 'border-term-green/50' : 'border-term-red/50'
  return (
    <div className={`flex-1 border-l-2 ${borderTone} pl-3`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[12px] font-bold text-term-amber tracking-wide">{row.asset}</span>
        <span className={`text-[11px] font-semibold ${tone}`}>{row.gex_regime}</span>
        <span className="text-[10px] text-term-muted ml-auto">{fmtAgo(row.as_of_utc)}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-term-text">{row.bias}</p>
      {row.note && <p className="mt-1 text-[11px] text-term-muted">{row.note}</p>}
    </div>
  )
}

export function PlanoDoDia({ levels }: { levels: LevelRow[] }) {
  const nq = levels.find((r) => r.asset === 'NQ')
  const btc = levels.find((r) => r.asset === 'BTC')
  if (!nq && !btc) return null
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {nq && <AssetPlan row={nq} />}
      {btc && <AssetPlan row={btc} />}
    </div>
  )
}
