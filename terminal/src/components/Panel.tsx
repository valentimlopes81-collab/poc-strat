import type { ReactNode } from 'react'

export function Panel({
  title,
  src,
  right,
  span2,
  children,
}: {
  title: string
  src?: string
  right?: ReactNode
  span2?: boolean
  children: ReactNode
}) {
  return (
    <div className={`bg-term-panel border border-term-border p-3 ${span2 ? 'md:col-span-2' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 border-b border-term-border pb-1.5 mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-term-amber">
          {title}
          {src && <span className="ml-2 text-[10px] font-normal uppercase tracking-normal text-term-muted">{src}</span>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

export function StatRow({ label, value, valueClass }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between py-0.5 text-[12px]">
      <span className="text-term-muted">{label}</span>
      <span className={`tabular-nums font-semibold ${valueClass ?? 'text-term-text'}`}>{value}</span>
    </div>
  )
}

export function Badge({ children, tone }: { children: ReactNode; tone: 'ok' | 'bad' | 'warn' }) {
  const cls = {
    ok: 'bg-term-green/15 text-term-green',
    bad: 'bg-term-red/15 text-term-red',
    warn: 'bg-term-amber/15 text-term-amber',
  }[tone]
  return <span className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold tracking-wide ${cls}`}>{children}</span>
}
