import { useEffect, useState } from 'react'
import { fmtDuration } from '../lib/time'

interface Feed {
  label: string
  source: 'live' | 'snapshot' | null
  /** when the numbers were computed (server side) */
  asOf: string | undefined
  error: string | null
}

/** One-line health of the data feeds: live, serving a saved snapshot, or down. */
export function LiveStatus({ feeds }: { feeds: Feed[] }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide">
      {feeds.map((f) => {
        const age = f.asOf ? now - new Date(f.asOf).getTime() : null
        const stale = age != null && age > 10 * 60_000
        const state = f.source === 'live' && !stale ? 'live' : f.source ? 'old' : f.error ? 'down' : 'loading'
        const dot = { live: 'bg-term-green animate-pulse', old: 'bg-term-amber', down: 'bg-term-red', loading: 'bg-term-muted' }[state]
        const text = { live: 'text-term-muted', old: 'text-term-amber', down: 'text-term-red', loading: 'text-term-muted' }[state]
        const word =
          state === 'loading' ? 'a carregar' : state === 'down' ? 'sem dados' : `${f.source === 'snapshot' ? 'snapshot · ' : ''}há ${fmtDuration(age ?? 0)}`
        return (
          <span key={f.label} className={`flex items-center gap-1 ${text}`} title={f.error ? `Último erro: ${f.error}` : undefined}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {f.label} {word}
          </span>
        )
      })}
    </div>
  )
}
