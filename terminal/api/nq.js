// GET /api/nq            -> levels, exposures by strike, GEX profile, 0DTE, expected move
// GET /api/nq?view=vol   -> heatmap, IV term structure, skew, surface
// Source: Cboe delayed QQQ chain (15 min), NQ=F and VIX for context.

import { fetchChain, fetchQuote, parseChain } from './_lib/cboe.js'
import { optional, round, sendError, sendJson } from './_lib/http.js'
import { buildCore, buildVol } from './_lib/nq-analytics.js'
import { fetchChart } from './_lib/yahoo.js'

async function fetchVix() {
  const q = (await fetchQuote('_VIX'))?.data
  if (!q?.current_price) return null
  return { value: round(q.current_price, 2), changePct: round(q.price_change_percent, 1) }
}

export default async function handler(req, res) {
  try {
    const view = new URL(req.url, 'http://x').searchParams.get('view')
    if (view === 'vol') {
      const chain = parseChain(await fetchChain('QQQ'))
      return sendJson(res, buildVol(chain), { sMaxAge: 180, swr: 900 })
    }
    const [chainJson, nq, vix] = await Promise.all([
      fetchChain('QQQ'),
      optional(fetchChart('NQ=F', '5d', '5m')),
      optional(fetchVix()),
    ])
    const chain = parseChain(chainJson)
    if (!chain.spot || chain.rows.length < 200) throw new Error('Cadeia QQQ incompleta na Cboe')
    sendJson(res, buildCore(chain, { nqCandles: nq?.candles, nqLast: nq?.last, vix }))
  } catch (err) {
    sendError(res, err)
  }
}
