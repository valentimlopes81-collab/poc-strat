import { useEffect, useRef, useState } from 'react'
import type { BtcCore, NqCore } from '../api'
import type { AlertRow } from '../types'

/** What the alert rules look at, reduced to plain numbers so the rules are easy to test. */
export interface AlertSnapshot {
  asset: 'NQ' | 'BTC'
  time: string
  price: number
  gex: number
  /** distance (in price units) under which a level counts as "near" */
  near: number
  unit: string
  levels: Array<{ name: string; value: number; label: string }>
}

const fmt = (v: number) => Math.round(v).toLocaleString('pt-PT')

export function nqSnapshot(core: NqCore): AlertSnapshot {
  const l = core.level
  const levels: AlertSnapshot['levels'] = []
  const add = (name: string, value: number | null | undefined, ref: string | null | undefined) => {
    if (value != null) levels.push({ name, value, label: ref ?? fmt(value) })
  }
  add('Call Wall', l.call_wall, l.call_wall_ref)
  add('Put Wall', l.put_wall, l.put_wall_ref)
  add('Zero-gamma', l.zero_gamma, l.zero_gamma_ref)
  if (core.zero_dte?.gamma_wall != null && core.zero_dte.gamma_wall !== l.call_wall && core.zero_dte.gamma_wall !== l.put_wall) {
    add('Gamma Wall 0DTE', core.zero_dte.gamma_wall, l.dte0_dominant_ref)
  }
  return { asset: 'NQ', time: l.as_of_utc, price: l.price, gex: l.gex_total_b, near: 30, unit: 'pts', levels }
}

export function btcSnapshot(core: BtcCore): AlertSnapshot {
  const l = core.level
  const levels: AlertSnapshot['levels'] = []
  const add = (name: string, value: number | null) => {
    if (value != null) levels.push({ name, value, label: `$${fmt(value)}` })
  }
  add('Call Wall', l.call_wall)
  add('Put Wall', l.put_wall)
  add('Zero-gamma', l.zero_gamma)
  return { asset: 'BTC', time: l.as_of_utc, price: l.price, gex: l.gex_total_b, near: 300, unit: '$', levels }
}

const dist = (s: AlertSnapshot, d: number) => (s.unit === '$' ? `$${fmt(Math.abs(d))}` : `${fmt(Math.abs(d))}${s.unit}`)
const priceText = (s: AlertSnapshot) => (s.unit === '$' ? `$${fmt(s.price)}` : fmt(s.price))

/**
 * Compares two consecutive readings of one asset and returns what changed in
 * a way worth flagging: a regime flip, a wall that moved, price crossing a
 * level, or price coming within reach of one. Context only, never a signal.
 */
export function detectAlerts(prev: AlertSnapshot, next: AlertSnapshot): AlertRow[] {
  const out: AlertRow[] = []
  const push = (severity: AlertRow['severity'], title: string, detail: string) => out.push({ time: next.time, asset: next.asset, severity, title, detail, auto: true })

  if (prev.gex < 0 !== next.gex < 0) {
    push(
      'critical',
      `GEX virou ${next.gex >= 0 ? 'positivo' : 'negativo'} (${next.gex.toFixed(2)}B)`,
      `Era ${prev.gex.toFixed(2)}B na leitura anterior. Preço ${priceText(next)}. ${next.gex >= 0 ? 'Regime de pin/baixa volatilidade.' : 'Regime que amplifica o movimento.'}`,
    )
  }

  for (const lvl of next.levels) {
    const before = prev.levels.find((p) => p.name === lvl.name)
    if (!before) continue
    if (before.value !== lvl.value) {
      // zero-gamma is recomputed continuously; only a real jump is news
      const moved = Math.abs(lvl.value - before.value)
      if (lvl.name !== 'Zero-gamma' || moved > next.near * 2) {
        push('notable', `${lvl.name} mudou para ${lvl.label}`, `Estava em ${before.label}. Preço ${priceText(next)}, agora a ${dist(next, next.price - lvl.value)} do novo nível.`)
      }
      continue
    }
    const dPrev = prev.price - lvl.value
    const dNext = next.price - lvl.value
    if (dPrev !== 0 && dNext !== 0 && dPrev > 0 !== dNext > 0) {
      push('critical', `Preço cruzou o ${lvl.name} para ${dNext > 0 ? 'cima' : 'baixo'}`, `${lvl.name} ${lvl.label}. Preço ${priceText(next)}, estava a ${dist(next, dPrev)} na leitura anterior.`)
    } else if (Math.abs(dNext) <= next.near && Math.abs(dPrev) > next.near) {
      push('notable', `Preço a ${dist(next, dNext)} do ${lvl.name}`, `${lvl.name} ${lvl.label}. Preço ${priceText(next)}, a aproximar-se por ${dNext > 0 ? 'cima' : 'baixo'}.`)
    }
  }
  return out
}

const KEY = 'nqbtc:auto-alerts'
const MAX_KEPT = 60

function load(): AlertRow[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(rows) ? (rows as AlertRow[]) : []
  } catch {
    return []
  }
}

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch {
    // audio blocked until the user interacts with the page
  }
}

/**
 * Runs the alert rules on every live refresh while the terminal is open.
 * Alerts are kept in this browser only. With `notify` on, each new alert
 * also raises a desktop notification and a short tone.
 */
export function useAutoAlerts(nq: NqCore | null, btc: BtcCore | null, notify: boolean): AlertRow[] {
  const [alerts, setAlerts] = useState<AlertRow[]>(load)
  const last = useRef<{ NQ?: AlertSnapshot; BTC?: AlertSnapshot }>({})

  useEffect(() => {
    const fresh: AlertRow[] = []
    for (const snap of [nq && nqSnapshot(nq), btc && btcSnapshot(btc)]) {
      if (!snap) continue
      const prev = last.current[snap.asset]
      if (prev && prev.time !== snap.time) fresh.push(...detectAlerts(prev, snap))
      last.current[snap.asset] = snap
    }
    if (!fresh.length) return
    setAlerts((old) => {
      const next = [...fresh, ...old].slice(0, MAX_KEPT)
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // kept in memory for this session only
      }
      return next
    })
    if (notify) {
      beep()
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        for (const a of fresh) new Notification(`${a.asset} · ${a.title}`, { body: a.detail, tag: `${a.asset}-${a.title}` })
      }
    }
  }, [nq, btc, notify])

  return alerts
}
