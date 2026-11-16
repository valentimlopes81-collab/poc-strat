import { useEffect, useState } from 'react'
import { fmtDuration } from '../lib/time'
import type { EconEvent } from '../types'

/** Countdown to the next high-impact release on the calendar. */
export function NextEvent({ events }: { events: EconEvent[] | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  const next = (events ?? [])
    .filter((e) => e.impact === 'High')
    .map((e) => ({ ...e, at: new Date(e.date).getTime() }))
    .filter((e) => e.at > now)
    .sort((a, b) => a.at - b.at)[0]
  if (!next) return null
  const soon = next.at - now < 30 * 60_000

  return (
    <span className={`text-[10px] uppercase tracking-wide ${soon ? 'text-term-red font-bold' : 'text-term-muted'}`} title={new Date(next.at).toLocaleString('pt-PT')}>
      Próximo evento: <span className={soon ? '' : 'text-term-text'}>{next.title}</span> em {fmtDuration(next.at - now)}
    </span>
  )
}
