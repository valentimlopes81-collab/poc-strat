// GET /api/cross -> cross-asset context: performance, correlation matrix,
// rolling correlation against NQ, and NQ volatility models (EWMA, GARCH)
// next to what options imply. Daily data from Yahoo, IV30 from Cboe.

import { fetchQuote } from './_lib/cboe.js'
import { optional, round, sendError, sendJson } from './_lib/http.js'
import { ewmaVol, fitGarch, logReturns, pearson } from './_lib/stats.js'
import { fetchChart } from './_lib/yahoo.js'

const ASSETS = [
  { key: 'nq', label: 'NQ', symbol: 'NQ=F' },
  { key: 'btc', label: 'BTC', symbol: 'BTC-USD' },
  { key: 'dxy', label: 'DXY', symbol: 'DX-Y.NYB' },
  { key: 'vix', label: 'VIX', symbol: '^VIX' },
  { key: 'us10y', label: 'US10Y', symbol: '^TNX' },
  { key: 'gold', label: 'Ouro', symbol: 'GC=F' },
]
const ROLL = 30

const dateOf = (c) => new Date(c.time * 1000).toISOString().slice(0, 10)
const pctChange = (closes, back) => (closes.length > back ? (closes.at(-1) / closes.at(-1 - back) - 1) * 100 : null)

// Daily returns of two assets over the dates both traded (BTC also trades
// weekends, so each return spans from one common date to the next).
function alignedReturns(a, b) {
  const bByDate = new Map(b.map((c) => [dateOf(c), c.close]))
  const dates = []
  const ca = []
  const cb = []
  for (const c of a) {
    const d = dateOf(c)
    const other = bByDate.get(d)
    if (other == null) continue
    dates.push(c.time)
    ca.push(c.close)
    cb.push(other)
  }
  return { times: dates.slice(1), ra: logReturns(ca), rb: logReturns(cb) }
}

export function buildCross(series, iv30) {
  const have = ASSETS.filter((a) => series[a.key]?.length > 60)
  const assets = have.map((a) => {
    const closes = series[a.key].map((c) => c.close)
    return { key: a.key, label: a.label, last: round(closes.at(-1), 2), chg_1d: round(pctChange(closes, 1), 2), chg_5d: round(pctChange(closes, 5), 2), chg_20d: round(pctChange(closes, 20), 2) }
  })

  const matrix = (window) =>
    have.map((a) =>
      have.map((b) => {
        if (a === b) return 1
        const { ra, rb } = alignedReturns(series[a.key], series[b.key])
        return round(pearson(ra.slice(-window), rb.slice(-window)), 2)
      }),
    )

  const rolling = {}
  const nq = series.nq
  if (nq?.length > 60) {
    for (const a of have) {
      if (a.key === 'nq') continue
      const { times, ra, rb } = alignedReturns(nq, series[a.key])
      const pts = []
      for (let i = ROLL; i <= ra.length; i++) pts.push({ time: times[i - 1], value: round(pearson(ra.slice(i - ROLL, i), rb.slice(i - ROLL, i)), 3) })
      rolling[a.key] = pts.filter((p) => p.value != null).slice(-180)
    }
  }

  let vol = null
  if (nq?.length > 120) {
    const rets = logReturns(nq.map((c) => c.close))
    const times = nq.map((c) => c.time)
    const ewma = ewmaVol(rets)
    const garch = fitGarch(rets)
    // both series end with the estimate for the next session, stamped on the last bar
    const stamp = (values) => values.slice(-180).map((v, i, arr) => ({ time: times[times.length - arr.length + i], value: round(v, 2) }))
    vol = {
      ewma: stamp(ewma),
      garch: garch ? stamp(garch.series.slice(1)) : [],
      garch_params: garch ? { alpha: round(garch.alpha, 3), beta: round(garch.beta, 3), persistence: round(garch.persistence, 3), long_run_vol: round(garch.longRunVol, 1) } : null,
      garch_forecast: garch ? [1, 5, 10, 21].map((days) => ({ days, vol: round(garch.forecast(days), 1) })) : [],
      implied_30d: iv30 ?? null,
    }
  }

  return { as_of_utc: new Date().toISOString().slice(0, 19) + 'Z', assets, labels: have.map((a) => a.label), keys: have.map((a) => a.key), corr_20d: matrix(20), corr_60d: matrix(60), roll_window: ROLL, rolling, vol }
}

export default async function handler(_req, res) {
  try {
    const [charts, quote] = await Promise.all([
      Promise.all(ASSETS.map((a) => optional(fetchChart(a.symbol, a.key === 'nq' ? '2y' : '1y', '1d')))),
      optional(fetchQuote('QQQ')),
    ])
    const series = {}
    ASSETS.forEach((a, i) => {
      if (charts[i]) series[a.key] = charts[i].candles
    })
    if (!series.nq) throw new Error('Sem histórico diário do NQ')
    sendJson(res, buildCross(series, quote?.data?.iv30 ?? null), { sMaxAge: 900, swr: 3600 })
  } catch (err) {
    sendError(res, err)
  }
}
