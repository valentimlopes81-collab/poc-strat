import { getJson } from './http.js'
import { DAY_MS, YEAR_MS } from './time.js'

const BASE = 'https://www.deribit.com/api/v2/public'
const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 }
const NAME = /^BTC-(\d{1,2})([A-Z]{3})(\d{2})-(\d+)-([CP])$/

const call = async (method, params) => (await getJson(`${BASE}/${method}?${new URLSearchParams(params)}`)).result

export const fetchBookSummary = () => call('get_book_summary_by_currency', { currency: 'BTC', kind: 'option' })
export const fetchIndex = async (name) => (await call('get_index_price', { index_name: name })).index_price
export const fetchPerp = () => call('ticker', { instrument_name: 'BTC-PERPETUAL' })

// Deribit options settle at 08:00 UTC on the expiry date.
export function parseSummary(instruments, nowMs = Date.now()) {
  const rows = []
  for (const inst of instruments ?? []) {
    const m = NAME.exec(inst.instrument_name ?? '')
    if (!m || !(m[2] in MONTHS)) continue
    const expiryMs = Date.UTC(2000 + Number(m[3]), MONTHS[m[2]], Number(m[1]), 8)
    const T = (expiryMs - nowMs) / YEAR_MS
    const iv = inst.mark_iv
    if (T <= 0 || !(iv > 0)) continue
    rows.push({
      strike: Number(m[4]),
      T,
      iv: iv / 100,
      oi: inst.open_interest ?? 0,
      cp: m[5],
      expiry: new Date(expiryMs).toISOString().slice(0, 10),
      dte: Math.floor((expiryMs - nowMs) / DAY_MS),
      volume: inst.volume ?? 0,
      // option prices are quoted in BTC
      mid: (inst.mark_price ?? 0) * (inst.underlying_price ?? 0),
    })
  }
  return rows
}
