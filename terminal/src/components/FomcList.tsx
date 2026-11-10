import type { FomcRow } from '../types'

export function FomcList({ fomc }: { fomc: FomcRow[] }) {
  return (
    <div className="flex flex-col gap-1">
      {fomc.map((d, i) => (
        <div key={i} className="flex justify-between gap-2 py-0.5 text-[12px] border-b border-term-border last:border-0">
          <span className="text-term-muted">
            {d.date} · {d.label}
          </span>
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-term-blue hover:underline shrink-0">
            abrir ↗
          </a>
        </div>
      ))}
    </div>
  )
}
