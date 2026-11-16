import { getJson } from './http.js'
import { YEAR_MS, daysBetween, expiryCloseUtcMs, nyDateStr, parseNyNaive } from './time.js'

const BASE = 'https://cdn-api.cboe.com/api/global/delayed_quotes'

export const fetchChain = (symbol) => getJson(`${BASE}/options/${symbol}.json`, { timeoutMs: 15000 })
export const fetchQuote = (symbol) => getJson(`${BASE}/quotes/${symbol}.json`)
export const fetchIntraday = (symbol) => getJson(`${BASE}/charts/intraday/${symbol}.json`)

const OCC = /^([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/

// Cboe's delayed chain -> flat rows of every contract that has not expired.
// `rows` is the subset with a usable IV (what any greek needs); `contracts`
// is all of them, for measures that only depend on OI/volume: the vendor
// reports IV 0 on deep in-the-money contracts near expiry, and dropping
// those would shift max pain and put/call ratios from one minute to the next.
export function parseChain(json, nowMs = Date.now()) {
  const data = json?.data ?? {}
  const today = nyDateStr(nowMs)
  const closeCache = new Map()
  const contracts = []
  for (const o of data.options ?? []) {
    const m = OCC.exec(o.option ?? '')
    if (!m) continue
    const iv = o.iv ?? 0
    const expiry = `20${m[2]}-${m[3]}-${m[4]}`
    let closeMs = closeCache.get(expiry)
    if (closeMs === undefined) {
      closeMs = expiryCloseUtcMs(expiry)
      closeCache.set(expiry, closeMs)
    }
    const T = (closeMs - nowMs) / YEAR_MS
    if (T <= 0) continue
    const bid = o.bid ?? 0
    const ask = o.ask ?? 0
    contracts.push({
      strike: Number(m[6]) / 1000,
      T,
      iv,
      oi: o.open_interest ?? 0,
      cp: m[5],
      expiry,
      dte: daysBetween(today, expiry),
      volume: o.volume ?? 0,
      mid: bid > 0 && ask > 0 ? (bid + ask) / 2 : (o.last_trade_price ?? 0),
      delta: o.delta ?? null,
    })
  }
  return {
    contracts,
    rows: contracts.filter((r) => r.iv > 0),
    spot: data.current_price ?? data.close ?? null,
    prevClose: data.prev_day_close ?? null,
    open: data.open ?? null,
    iv30: data.iv30 ?? null,
    iv30Change: data.iv30_change ?? null,
    quoteTimeMs: parseNyNaive(data.last_trade_time),
    vendorTimestamp: json?.timestamp ?? null,
  }
}
