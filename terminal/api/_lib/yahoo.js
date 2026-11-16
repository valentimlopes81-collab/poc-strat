import { getJson } from './http.js'

// Public chart endpoint (no crumb/cookie). Returns candles oldest-first with
// rows that have no trade (null close) dropped.
export async function fetchChart(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=true`
  const json = await getJson(url)
  const r = json?.chart?.result?.[0]
  if (!r) throw new Error(`Yahoo sem dados para ${symbol}`)
  const q = r.indicators?.quote?.[0] ?? {}
  const ts = r.timestamp ?? []
  const candles = []
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i]
    if (close == null) continue
    candles.push({
      time: ts[i],
      open: q.open?.[i] ?? close,
      high: q.high?.[i] ?? close,
      low: q.low?.[i] ?? close,
      close,
      volume: q.volume?.[i] ?? 0,
    })
  }
  return {
    candles,
    last: r.meta?.regularMarketPrice ?? candles.at(-1)?.close ?? null,
    lastTime: r.meta?.regularMarketTime ?? candles.at(-1)?.time ?? null,
    prevClose: r.meta?.chartPreviousClose ?? r.meta?.previousClose ?? null,
  }
}
