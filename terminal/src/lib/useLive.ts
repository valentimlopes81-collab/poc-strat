import { useEffect, useRef, useState } from 'react'
import { fetchData } from './dataSource'

export interface LiveState<T> {
  data: T | null
  /** 'live' = fresh from the API, 'snapshot' = last saved copy (API unreachable) */
  source: 'live' | 'snapshot' | null
  fetchedAt: number | null
  error: string | null
}

interface Options {
  /** static copy to show if the API cannot be reached before any live data arrived */
  fallback?: string
  intervalMs?: number
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? `${res.status} ${res.statusText}`)
  if (body == null) throw new Error('resposta vazia')
  return body as T
}

const EMPTY = { data: null, source: null, fetchedAt: null, error: null }

/** state tagged with the url it belongs to, so a url change shows empty at once instead of the previous feed */
type Keyed<T> = LiveState<T> & { url: string | null }

/**
 * Polls a live endpoint. Pauses while the tab is hidden and refreshes as soon
 * as it becomes visible again. A failed poll keeps the last good data on
 * screen; the snapshot is only used when nothing live has loaded yet.
 */
export function useLive<T>(url: string | null, { fallback, intervalMs = 60_000 }: Options = {}): LiveState<T> {
  const [state, setState] = useState<Keyed<T>>({ ...EMPTY, url })
  const lastOk = useRef(0)

  useEffect(() => {
    lastOk.current = 0
    if (!url) return
    let cancelled = false
    let hasLive = false
    let triedFallback = false

    const tick = async () => {
      try {
        const data = await getJson<T>(url)
        if (cancelled) return
        hasLive = true
        lastOk.current = Date.now()
        setState({ url, data, source: 'live', fetchedAt: lastOk.current, error: null })
      } catch (err) {
        if (cancelled) return
        const error = err instanceof Error ? err.message : String(err)
        if (!hasLive && fallback && !triedFallback) {
          triedFallback = true
          try {
            const data = await fetchData<T>(fallback)
            if (!cancelled && !hasLive) setState({ url, data, source: 'snapshot', fetchedAt: Date.now(), error })
            return
          } catch {
            // no snapshot either: fall through and surface the API error
          }
        }
        setState((s) => (s.url === url ? { ...s, error } : { ...EMPTY, url, error }))
      }
    }

    tick()
    const timer = setInterval(() => {
      if (!document.hidden) tick()
    }, intervalMs)
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastOk.current > intervalMs) tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [url, fallback, intervalMs])

  return state.url === url ? state : EMPTY
}
