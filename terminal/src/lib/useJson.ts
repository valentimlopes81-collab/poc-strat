import { useEffect, useState } from 'react'

type State<T> =
  | { status: 'loading'; data: null }
  | { status: 'ok'; data: T }
  | { status: 'error'; data: null; message: string }

export function useJson<T>(path: string): State<T> {
  const [state, setState] = useState<State<T>>({ status: 'loading', data: null })

  useEffect(() => {
    let cancelled = false
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', data: null, message: String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return state
}

export function fmtUsd(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const sign = v < 0 ? '-' : ''
  return sign + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtAgo(iso: string | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (Number.isNaN(mins)) return ''
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `${mins} min atrás`
  return `${Math.round(mins / 60)}h atrás`
}

export function fmtCompact(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${abs.toFixed(0)}`
}
