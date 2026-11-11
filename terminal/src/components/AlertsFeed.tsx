import type { AlertRow } from '../types'
import { fmtAgo } from '../lib/useJson'
import { usePanelFullscreen } from '../lib/panelFullscreen'

const SEVERITY_DOT: Record<AlertRow['severity'], string> = {
  critical: 'bg-term-red',
  notable: 'bg-term-amber',
  info: 'bg-term-blue',
  system: 'bg-term-muted',
}

export function AlertsFeed({ alerts }: { alerts: AlertRow[] }) {
  const isFull = usePanelFullscreen()
  const sorted = [...alerts].sort((a, b) => (a.time < b.time ? 1 : -1))

  if (!sorted.length) {
    return <div className="text-[12px] text-term-muted py-4 text-center">Sem alertas registados.</div>
  }

  return (
    <div className="overflow-auto flex flex-col gap-2" style={{ maxHeight: isFull ? '75vh' : 220 }}>
      {sorted.map((a, i) => (
        <div key={i} className="flex gap-2 border-b border-term-border/60 pb-2 last:border-b-0 last:pb-0">
          <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[a.severity]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold text-term-text">
                <span className="text-term-amber mr-1.5">{a.asset}</span>
                {a.title}
              </span>
              <span className="text-[10px] text-term-muted whitespace-nowrap shrink-0">{fmtAgo(a.time)}</span>
            </div>
            <div className="text-[11px] text-term-muted mt-0.5">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
