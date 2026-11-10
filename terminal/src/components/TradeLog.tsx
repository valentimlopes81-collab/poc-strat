import { useMemo, useState } from 'react'
import type { TradeRow } from '../types'
import { fmtUsd } from '../lib/useJson'

function seqOf(id: string): number {
  const m = /L(\d+)/.exec(id)
  return m ? Number(m[1]) : 0
}

export function TradeLog({ trades }: { trades: TradeRow[] }) {
  const [sort, setSort] = useState<{ field: keyof TradeRow | 'id'; dir: 1 | -1 }>({ field: 'id', dir: 1 })

  const sorted = useMemo(() => {
    const rows = [...trades]
    rows.sort((a, b) => {
      const av = sort.field === 'id' ? seqOf(a.id) : a[sort.field]
      const bv = sort.field === 'id' ? seqOf(b.id) : b[sort.field]
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sort.dir
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * sort.dir
    })
    return rows
  }, [trades, sort])

  const toggle = (field: keyof TradeRow | 'id') =>
    setSort((s) => (s.field === field ? { field, dir: (s.dir * -1) as 1 | -1 } : { field, dir: 1 }))

  const cols: Array<{ key: keyof TradeRow | 'id'; label: string; num?: boolean }> = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Data' },
    { key: 'direction', label: 'Direção' },
    { key: 'result', label: 'Resultado' },
    { key: 'r_multiple', label: 'R', num: true },
    { key: 'pnl_usd', label: 'P&L', num: true },
    { key: 'notes_short', label: 'Notas' },
  ]

  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-term-muted uppercase text-[10px] tracking-wide">
            {cols.map((c) => (
              <th
                key={c.key}
                onClick={() => toggle(c.key)}
                className={`text-left py-1 pr-2 sticky top-0 bg-term-panel cursor-pointer select-none ${c.num ? 'text-right' : ''}`}
              >
                {c.label}
                {sort.field === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const resultColor = t.result === 'Win' ? 'text-term-green' : t.result === 'Loss' ? 'text-term-red' : 'text-term-muted'
            const pnlColor = t.pnl_usd < 0 ? 'text-term-red' : t.pnl_usd > 0 ? 'text-term-green' : 'text-term-muted'
            return (
              <tr key={t.id} className="border-t border-term-border hover:bg-white/[0.03]">
                <td className="py-1 pr-2 whitespace-nowrap">{t.id}</td>
                <td className="py-1 pr-2 whitespace-nowrap">{t.date}</td>
                <td className="py-1 pr-2 whitespace-nowrap">{t.direction || '—'}</td>
                <td className={`py-1 pr-2 whitespace-nowrap ${resultColor}`}>{t.result}</td>
                <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">{t.r_multiple || '—'}</td>
                <td className={`py-1 pr-2 text-right tabular-nums whitespace-nowrap ${pnlColor}`}>
                  {t.pnl_approx ? '~' : ''}
                  {fmtUsd(t.pnl_usd)}
                </td>
                <td className="py-1 text-term-muted max-w-[26rem]">{t.notes_short}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
