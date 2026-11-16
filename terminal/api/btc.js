// GET /api/btc            -> levels, exposures by strike, GEX profile, DVOL, perp funding
// GET /api/btc?view=vol   -> heatmap, IV term structure, skew
// Source: Deribit public API.

import { buildBtcCore, buildBtcVol } from './_lib/btc-analytics.js'
import { fetchBookSummary, fetchIndex, fetchPerp, parseSummary } from './_lib/deribit.js'
import { optional, sendError, sendJson } from './_lib/http.js'

export default async function handler(req, res) {
  try {
    const view = new URL(req.url, 'http://x').searchParams.get('view')
    const [summary, spot, dvol, perp] = await Promise.all([
      fetchBookSummary(),
      fetchIndex('btc_usd'),
      view === 'vol' ? null : optional(fetchIndex('btcdvol_usdc')),
      view === 'vol' ? null : optional(fetchPerp()),
    ])
    const rows = parseSummary(summary)
    if (!spot || rows.length < 50) throw new Error('Cadeia BTC incompleta na Deribit')
    if (view === 'vol') return sendJson(res, buildBtcVol(rows, spot), { sMaxAge: 180, swr: 900 })
    sendJson(res, buildBtcCore(rows, spot, { dvol, perp }))
  } catch (err) {
    sendError(res, err)
  }
}
