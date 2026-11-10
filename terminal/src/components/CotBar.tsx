import type { CotRow } from '../types'

export function CotBar({ cot }: { cot: CotRow }) {
  const max = Math.max(cot.lf_long, cot.lf_short, 1)
  const rows = [
    { k: 'LONG', v: cot.lf_long, color: '#00d964' },
    { k: 'SHORT', v: cot.lf_short, color: '#ff3b30' },
  ]
  return (
    <div className="flex flex-col gap-1.5 py-1">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-2">
          <span className="text-[10px] text-term-muted w-12">{r.k}</span>
          <div className="flex-1 bg-term-border h-3">
            <div style={{ width: `${(r.v / max) * 100}%`, background: r.color, height: '100%' }} />
          </div>
          <span className="text-[11px] tabular-nums font-semibold w-16 text-right">{r.v.toLocaleString('en-US')}</span>
        </div>
      ))}
    </div>
  )
}
