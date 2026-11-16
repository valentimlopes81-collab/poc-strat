// Live BTC/USD from Kraken's public WebSocket (ticker, trades, order book).
// One shared connection, opened while at least one component is subscribed.

import { useSyncExternalStore } from 'react'

export interface Ticker {
  last: number
  bid: number
  ask: number
  changePct: number
  high: number
  low: number
  vwap: number
  volume: number
}

export interface Trade {
  /** epoch ms */
  t: number
  price: number
  qty: number
  side: 'buy' | 'sell'
}

export type BookLevel = [price: number, qty: number]

export interface KrakenState {
  status: 'connecting' | 'live' | 'down'
  ticker: Ticker | null
  /** oldest first */
  trades: Trade[]
  /** best first */
  bids: BookLevel[]
  asks: BookLevel[]
}

const WS_URL = 'wss://ws.kraken.com/v2'
const SYMBOL = 'BTC/USD'
const BOOK_DEPTH = 100
const MAX_TRADES = 4000
/** how often subscribers are told about new data; the feed itself is far chattier */
const FLUSH_MS = 500

let state: KrakenState = { status: 'connecting', ticker: null, trades: [], bids: [], asks: [] }
const listeners = new Set<() => void>()
const bids = new Map<number, number>()
const asks = new Map<number, number>()
let trades: Trade[] = []
let ticker: Ticker | null = null
let status: KrakenState['status'] = 'connecting'
let ws: WebSocket | null = null
let dirty = false
let flushTimer: ReturnType<typeof setInterval> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retries = 0

function topOfBook(side: Map<number, number>, descending: boolean): BookLevel[] {
  const levels = [...side.entries()].sort((a, b) => (descending ? b[0] - a[0] : a[0] - b[0]))
  // the feed only maintains BOOK_DEPTH levels per side; anything beyond is stale and must be dropped
  for (const [price] of levels.slice(BOOK_DEPTH)) side.delete(price)
  return levels.slice(0, BOOK_DEPTH)
}

function flush() {
  if (!dirty) return
  dirty = false
  state = { status, ticker, trades, bids: topOfBook(bids, true), asks: topOfBook(asks, false) }
  listeners.forEach((l) => l())
}

function applyLevels(side: Map<number, number>, levels: Array<{ price: number; qty: number }> | undefined) {
  for (const l of levels ?? []) {
    if (l.qty === 0) side.delete(l.price)
    else side.set(l.price, l.qty)
  }
}

function addTrades(incoming: Trade[]) {
  if (!incoming.length) return
  trades = [...trades, ...incoming].sort((a, b) => a.t - b.t).slice(-MAX_TRADES)
}

function onMessage(raw: string) {
  let msg: { channel?: string; type?: string; data?: unknown[] }
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }
  const data = msg.data
  if (!Array.isArray(data)) return
  if (msg.channel === 'ticker') {
    const d = data[0] as Record<string, number>
    ticker = { last: d.last, bid: d.bid, ask: d.ask, changePct: d.change_pct, high: d.high, low: d.low, vwap: d.vwap, volume: d.volume }
  } else if (msg.channel === 'trade') {
    addTrades(
      (data as Array<{ timestamp: string; price: number; qty: number; side: 'buy' | 'sell' }>).map((d) => ({
        t: Date.parse(d.timestamp),
        price: d.price,
        qty: d.qty,
        side: d.side,
      })),
    )
  } else if (msg.channel === 'book') {
    const d = data[0] as { bids?: Array<{ price: number; qty: number }>; asks?: Array<{ price: number; qty: number }> }
    if (msg.type === 'snapshot') {
      bids.clear()
      asks.clear()
    }
    applyLevels(bids, d.bids)
    applyLevels(asks, d.asks)
  } else {
    return
  }
  dirty = true
}

// The socket only replays ~50 trades on connect; the REST endpoint gives the
// last 1000 so the volume-delta chart has history from the first paint.
async function seedTrades() {
  try {
    const res = await fetch('https://api.kraken.com/0/public/Trades?pair=XBTUSD&count=1000')
    const json = await res.json()
    const key = Object.keys(json.result ?? {}).find((k) => k !== 'last')
    if (!key) return
    const seeded: Trade[] = (json.result[key] as Array<[string, string, number, string]>).map((r) => ({
      t: Math.round(r[2] * 1000),
      price: Number(r[0]),
      qty: Number(r[1]),
      side: r[3] === 'b' ? 'buy' : 'sell',
    }))
    const oldestLive = trades[0]?.t ?? Infinity
    addTrades(seeded.filter((s) => s.t < oldestLive))
    dirty = true
  } catch {
    // the live feed still works without the backfill
  }
}

function connect() {
  status = 'connecting'
  dirty = true
  const socket = new WebSocket(WS_URL)
  ws = socket
  socket.onopen = () => {
    retries = 0
    status = 'live'
    dirty = true
    const sub = (params: Record<string, unknown>) => socket.send(JSON.stringify({ method: 'subscribe', params: { symbol: [SYMBOL], ...params } }))
    sub({ channel: 'ticker' })
    sub({ channel: 'trade', snapshot: true })
    sub({ channel: 'book', depth: BOOK_DEPTH })
    seedTrades()
  }
  socket.onmessage = (e) => onMessage(String(e.data))
  socket.onclose = () => {
    if (ws !== socket) return
    ws = null
    status = 'down'
    dirty = true
    if (listeners.size) retryTimer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** retries++))
  }
  socket.onerror = () => socket.close()
}

function start() {
  flushTimer = setInterval(flush, FLUSH_MS)
  connect()
}

function stop() {
  if (flushTimer) clearInterval(flushTimer)
  if (retryTimer) clearTimeout(retryTimer)
  flushTimer = retryTimer = null
  const socket = ws
  ws = null
  socket?.close()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) start()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}

export function useKraken(): KrakenState {
  return useSyncExternalStore(subscribe, () => state)
}
