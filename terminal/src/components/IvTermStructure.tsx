import { usePanelFullscreen } from '../lib/panelFullscreen'
import type { IvTermData } from '../types'

export function IvTermStructure({ data }: { data: IvTermData }) {
  const isFull = usePanelFullscreen()
  const rows = data.rows
  if (!rows.length) return null
  const maxIv = Math.max(...rows.map((r) => r.atm_iv))

  return (
    <div className="overflow-auto" style={{ maxHeight: isFull ? '75vh' : 220 }}>
      <div className="flex flex-col gap-1">
        {rows.map((r) => {
          const pct = (r.atm_iv / maxIv) * 100
          return (
            <div key={r.expiry} className="flex items-center gap-2 text-[10px]">
              <span className="w-16 shrink-0 tabular-nums text-term-muted">
                {r.expiry.slice(5)} <span className="text-term-text/70">{r.dte}d</span>
              </span>
              <div className="flex-1 h-3 bg-black/40 relative overflow-hidden">
                <div className="h-full bg-term-blue/70" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-12 shrink-0 text-right tabular-nums text-term-text">{r.atm_iv.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] text-term-muted">
        IV ATM por expiração (straddle no strike mais próximo do spot). Picos sinalizam risco de evento (CPI/FOMC) embutido nessa data.
      </p>
    </div>
  )
}
