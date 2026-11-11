import type { LevelRow } from '../types'
import { fmtAgo } from '../lib/useJson'

interface LevelPoint {
  label: string
  value: number
  ref: string | null
}

function levelsFor(row: LevelRow): LevelPoint[] {
  const points: LevelPoint[] = [
    { label: 'Call Wall', value: row.call_wall, ref: row.call_wall_ref },
    { label: 'Put Wall', value: row.put_wall, ref: row.put_wall_ref },
    { label: 'Zero-gamma', value: row.zero_gamma, ref: row.zero_gamma_ref },
  ]
  if (row.dte0_dominant != null) points.push({ label: '0DTE dominante', value: row.dte0_dominant, ref: row.dte0_dominant_ref })
  return points.filter((p) => p.value != null).sort((a, b) => Math.abs(a.value - row.price) - Math.abs(b.value - row.price))
}

function fmtDist(d: number, asset: string) {
  const abs = Math.round(Math.abs(d))
  return asset === 'BTC' ? `$${abs.toLocaleString('en-US')}` : `${abs}pts`
}

function AssetPlanStructured({ row }: { row: LevelRow }) {
  const tone = row.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'
  const borderTone = row.gex_total_b >= 0 ? 'border-term-green/50' : 'border-term-red/50'
  const points = levelsFor(row)

  return (
    <div className={`flex-1 border-l-2 ${borderTone} pl-3`}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-[12px] font-bold text-term-amber tracking-wide">{row.asset}</span>
        <span className={`text-[11px] font-semibold ${tone}`}>{row.gex_regime}</span>
        <span className="text-[10px] text-term-muted ml-auto">{fmtAgo(row.as_of_utc)}</span>
      </div>

      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-wide text-term-muted">Preço agora</div>
        <div className="text-[14px] font-bold tabular-nums">{row.price_ref}</div>
      </div>

      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-wide text-term-muted mb-1">Níveis a vigiar</div>
        <div className="flex flex-col gap-0.5">
          {points.map((p) => {
            const d = p.value - row.price
            return (
              <div key={p.label} className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="text-term-text">
                  {p.label} <span className="text-term-muted">{p.ref ?? ''}</span>
                </span>
                <span className={`tabular-nums shrink-0 ${d >= 0 ? 'text-term-green' : 'text-term-red'}`}>
                  {d >= 0 ? '+' : '-'}
                  {fmtDist(d, row.asset)} {d >= 0 ? 'acima' : 'abaixo'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-wide text-term-muted">Bias</div>
        <p className="text-[13px] leading-relaxed">{row.bias}</p>
      </div>

      {row.scenarios && row.scenarios.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wide text-term-muted mb-1">Cenários</div>
          <ul className="flex flex-col gap-1">
            {row.scenarios.map((s, i) => (
              <li key={i} className="text-[11px] leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-term-amber">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.confirmation && (
        <div className="mt-2 pt-2 border-t border-term-border/60">
          <div className="text-[10px] uppercase tracking-wide text-term-amber">Esperar</div>
          <p className="text-[11px] text-term-muted leading-snug">{row.confirmation}</p>
        </div>
      )}

      {row.note && <p className="mt-2 text-[10px] text-term-muted">{row.note}</p>}
    </div>
  )
}

function AssetPlanNarrative({ row }: { row: LevelRow }) {
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
      {nq && (nq.scenarios?.length ? <AssetPlanStructured row={nq} /> : <AssetPlanNarrative row={nq} />)}
      {btc && (btc.scenarios?.length ? <AssetPlanStructured row={btc} /> : <AssetPlanNarrative row={btc} />)}
    </div>
  )
}
