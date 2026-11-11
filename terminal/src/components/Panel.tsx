import { useEffect, useState, type ReactNode } from 'react'
import { PanelFullscreenContext } from '../lib/panelFullscreen'

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
  const [full, setFull] = useState(false)

  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [full])

  const header = (
    <div className="flex items-baseline justify-between gap-2 border-b border-term-border pb-1.5 mb-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-term-amber">
        {title}
        {src && <span className="ml-2 text-[10px] font-normal uppercase tracking-normal text-term-muted">{src}</span>}
      </div>
      <div className="flex items-center gap-2">
        {right}
        <button
          onClick={() => setFull((f) => !f)}
          className="text-term-muted hover:text-term-amber text-[11px] leading-none w-5 h-5 shrink-0 flex items-center justify-center border border-term-border"
          title={full ? 'Sair de ecrã inteiro (Esc)' : 'Ecrã inteiro'}
        >
          {full ? '×' : '⤢'}
        </button>
      </div>
    </div>
  )

  if (full) {
    return (
      <>
        <div className="fixed inset-0 z-[190] bg-black/80" onClick={() => setFull(false)} />
        <div className="fixed inset-4 md:inset-10 z-[200] bg-term-panel border border-term-amber p-4 overflow-auto flex flex-col">
          {header}
          <PanelFullscreenContext.Provider value={true}>
            <div className="flex-1 min-h-0">{children}</div>
          </PanelFullscreenContext.Provider>
        </div>
      </>
    )
  }

  return (
    <div className={`bg-term-panel border border-term-border p-3 ${span2 ? 'md:col-span-2' : ''}`}>
      {header}
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
