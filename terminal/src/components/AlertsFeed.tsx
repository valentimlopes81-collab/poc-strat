import { useMemo, useState } from 'react'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import { fmtAgo } from '../lib/useJson'
import type { AlertRow } from '../types'

const SEVERITY_DOT: Record<AlertRow['severity'], string> = {
  critical: 'bg-term-red',
  notable: 'bg-term-amber',
  info: 'bg-term-blue',
  system: 'bg-term-muted',
}

type Filter = 'all' | 'NQ' | 'BTC' | 'critical' | 'auto'
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'NQ', label: 'NQ' },
  { id: 'BTC', label: 'BTC' },
  { id: 'critical', label: 'Críticos' },
  { id: 'auto', label: 'Automáticos' },
]

function matches(a: AlertRow, filter: Filter, query: string) {
  if (filter === 'NQ' || filter === 'BTC') {
    if (a.asset !== filter) return false
  } else if (filter === 'critical') {
    if (a.severity !== 'critical') return false
  } else if (filter === 'auto' && !a.auto) {
    return false
  }
  return !query || `${a.title} ${a.detail}`.toLowerCase().includes(query)
}

export function AlertsFeed({ alerts }: { alerts: AlertRow[] }) {
  const isFull = usePanelFullscreen()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase()
    return alerts.filter((a) => matches(a, filter, query)).sort((a, b) => (a.time < b.time ? 1 : -1))
  }, [alerts, filter, search])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex border border-term-border text-[10px]">
          {FILTERS.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2 py-0.5 ${i ? 'border-l border-term-border' : ''} ${filter === f.id ? 'bg-term-amber text-black font-bold' : 'text-term-muted hover:text-term-text'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="procurar nos alertas…"
          aria-label="Procurar nos alertas"
          className="flex-1 min-w-[140px] bg-black border border-term-border px-2 py-0.5 text-[11px] text-term-text placeholder:text-term-muted focus:outline-none focus:border-term-amber"
        />
        <span className="text-[10px] text-term-muted tabular-nums">
          {shown.length}/{alerts.length}
        </span>
      </div>
      {shown.length === 0 ? (
        <div className="text-[12px] text-term-muted py-4 text-center">{alerts.length ? 'Nenhum alerta corresponde ao filtro.' : 'Sem alertas registados.'}</div>
      ) : (
        <div className="overflow-auto flex flex-col gap-2" style={{ maxHeight: isFull ? '70vh' : 220 }}>
          {shown.map((a, i) => (
            <div key={`${a.time}-${i}`} className="flex gap-2 border-b border-term-border/60 pb-2 last:border-b-0 last:pb-0">
              <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[a.severity]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold text-term-text">
                    <span className="text-term-amber mr-1.5">{a.asset}</span>
                    {a.title}
                    {a.auto && <span className="ml-1.5 text-[9px] font-normal uppercase tracking-wide text-term-muted border border-term-border px-1">auto</span>}
                  </span>
                  <span className="text-[10px] text-term-muted whitespace-nowrap shrink-0">{fmtAgo(a.time)}</span>
                </div>
                <div className="text-[11px] text-term-muted mt-0.5">{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
