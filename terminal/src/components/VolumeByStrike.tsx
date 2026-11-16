import { fmtCompact } from '../lib/useJson'

interface Row {
  strike: number
  calls: number
  puts: number
}

/** Today's option volume at the busiest strikes: puts to the left, calls to the right. */
export function VolumeByStrike({ rows, spot, fmtStrike }: { rows: Row[]; spot: number; fmtStrike: (s: number) => string }) {
  if (!rows.length) return <div className="text-[11px] text-term-muted py-3">Sem volume registado hoje.</div>
  const max = Math.max(...rows.map((r) => Math.max(r.calls, r.puts)), 1)
  const sorted = [...rows].sort((a, b) => b.strike - a.strike)
  const nearest = sorted.reduce((best, r) => (Math.abs(r.strike - spot) < Math.abs(best.strike - spot) ? r : best), sorted[0])

  return (
    <div>
      <div className="flex items-center gap-4 text-[10px] text-term-muted mb-1.5">
        <span>
          <span className="inline-block w-2 h-2 bg-term-red mr-1" />
          Puts
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-term-green mr-1" />
          Calls
        </span>
        <span className="ml-auto">contratos negociados hoje</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {sorted.map((r) => {
          const atSpot = r === nearest
          return (
            <div key={r.strike} className="flex items-center gap-1.5 text-[10px] tabular-nums" title={`${fmtStrike(r.strike)} · puts ${r.puts.toLocaleString('en-US')} · calls ${r.calls.toLocaleString('en-US')}`}>
              <span className="w-12 text-right text-term-muted">{fmtCompact(r.puts)}</span>
              <div className="flex-1 h-3 flex justify-end bg-black/40">
                <div className="h-full bg-term-red" style={{ width: `${(r.puts / max) * 100}%` }} />
              </div>
              <span className={`w-[92px] text-center whitespace-nowrap ${atSpot ? 'text-term-amber font-bold' : 'text-term-text'}`}>{fmtStrike(r.strike)}</span>
              <div className="flex-1 h-3 bg-black/40">
                <div className="h-full bg-term-green" style={{ width: `${(r.calls / max) * 100}%` }} />
              </div>
              <span className="w-12 text-term-muted">{fmtCompact(r.calls)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
