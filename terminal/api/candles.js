// GET /api/candles?symbol=nq|btc|vix|dxy&tf=5m|15m|1h|1d
// GET /api/candles?symbol=qqqflow  -> today's QQQ 5m bars with options call/put volume
// Sources: Yahoo chart (NQ=F, ^VIX, DXY), Kraken (BTC), Cboe (QQQ options volume).

import { fetchIntraday } from './_lib/cboe.js'
import { getJson, sendError, sendJson } from './_lib/http.js'
import { parseNyNaive } from './_lib/time.js'
import { fetchChart } from './_lib/yahoo.js'

const YAHOO_SYMBOL = { nq: 'NQ=F', vix: '^VIX', dxy: 'DX-Y.NYB' }
const YAHOO_TF = {
  '5m': ['5d', '5m'],
  '15m': ['1mo', '15m'],
  '1h': ['3mo', '1h'],
  '1d': ['1y', '1d'],
}
const KRAKEN_TF = { '5m': 5, '15m': 15, '1h': 60, '1d': 1440 }
const TF_SECONDS = { '5m': 300, '15m': 900, '1h': 3600 }

// Yahoo appends the live print as an extra row stamped with the trade time
// rather than the bar open; fold it into its bar so every row sits on the grid.
export function snapToGrid(candles, tfSeconds) {
  const out = []
  for (const c of candles) {
    const time = Math.floor(c.time / tfSeconds) * tfSeconds
    const prev = out[out.length - 1]
    if (prev && prev.time === time) {
      prev.high = Math.max(prev.high, c.high)
      prev.low = Math.min(prev.low, c.low)
      prev.close = c.close
      prev.volume += c.volume
    } else {
      out.push({ ...c, time })
    }
  }
  return out
}

async function krakenCandles(tf) {
  const json = await getJson(`https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=${KRAKEN_TF[tf]}`)
  if (json.error?.length) throw new Error(`Kraken: ${json.error.join(', ')}`)
  const key = Object.keys(json.result).find((k) => k !== 'last')
  return json.result[key].map((r) => ({
    time: r[0],
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[6]),
  }))
}

// Cboe 1m bars (today only) folded into 5m buckets keyed by UTC epoch.
export function foldOptionsFlow(bars, bucketS = 300) {
  const out = new Map()
  for (const b of bars ?? []) {
    const ms = parseNyNaive(b.datetime)
    if (ms == null || !b.price) continue
    const t = Math.floor(ms / 1000 / bucketS) * bucketS
    let c = out.get(t)
    if (!c) out.set(t, (c = { time: t, open: b.price.open, high: b.price.high, low: b.price.low, close: b.price.close, volume: 0, calls_volume: 0, puts_volume: 0 }))
    c.high = Math.max(c.high, b.price.high)
    c.low = Math.min(c.low, b.price.low)
    c.close = b.price.close
    c.volume += b.volume?.stock_volume ?? 0
    c.calls_volume += b.volume?.calls_volume ?? 0
    c.puts_volume += b.volume?.puts_volume ?? 0
  }
  return [...out.values()].sort((a, b) => a.time - b.time)
}

export default async function handler(req, res) {
  try {
    const q = new URL(req.url, 'http://x').searchParams
    const symbol = q.get('symbol') ?? 'nq'
    const tf = q.get('tf') ?? '5m'
    const intraday = tf !== '1d'
    const cache = intraday ? { sMaxAge: 60, swr: 300 } : { sMaxAge: 900, swr: 3600 }

    if (symbol === 'qqqflow') {
      const json = await fetchIntraday('QQQ')
      return sendJson(res, { symbol, tf: '5m', candles: foldOptionsFlow(json?.data) }, { sMaxAge: 60, swr: 300 })
    }
    if (symbol === 'btc') {
      if (!(tf in KRAKEN_TF)) return sendError(res, `tf inválido: ${tf}`, 400)
      return sendJson(res, { symbol, tf, candles: await krakenCandles(tf) }, cache)
    }
    if (!(symbol in YAHOO_SYMBOL)) return sendError(res, `symbol inválido: ${symbol}`, 400)
    if (!(tf in YAHOO_TF)) return sendError(res, `tf inválido: ${tf}`, 400)
    const [range, interval] = YAHOO_TF[tf]
    const chart = await fetchChart(YAHOO_SYMBOL[symbol], range, interval)
    const candles = intraday ? snapToGrid(chart.candles, TF_SECONDS[tf]) : chart.candles
    sendJson(res, { symbol, tf, candles, last: chart.last, last_time: chart.lastTime, prev_close: chart.prevClose }, cache)
  } catch (err) {
    sendError(res, err)
  }
}
