import type { EconEvent } from '../types'

export function EconCalendar({ events }: { events: EconEvent[] }) {
  return (
    <div className="flex flex-col gap-1 max-h-[240px] overflow-auto">
      {events.map((e, i) => {
        const d = new Date(e.date)
        const high = e.impact === 'High'
        return (
          <div key={i} className="flex justify-between gap-2 py-0.5 text-[11px] border-b border-term-border last:border-0">
            <span className="text-term-muted whitespace-nowrap">
              {d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}{' '}
              {d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex-1">{e.title}</span>
            {(e.forecast || e.previous) && (
              <span className="text-term-muted whitespace-nowrap">
                f:{e.forecast || '—'} p:{e.previous || '—'}
              </span>
            )}
            <span className={`text-[9px] font-bold uppercase ${high ? 'text-term-red' : 'text-term-amber'}`}>{e.impact}</span>
          </div>
        )
      })}
    </div>
  )
}
