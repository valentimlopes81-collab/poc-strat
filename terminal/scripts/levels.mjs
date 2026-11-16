// Prints the NQ and BTC levels exactly as the site computes them, for use
// from a terminal or a routine.
//
// Usage: node scripts/levels.mjs        (from terminal/)

import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')

async function get(fn) {
  const { default: handler } = await import(pathToFileURL(path.join(root, 'api', `${fn}.js`)).href)
  return new Promise((resolve, reject) => {
    const res = { statusCode: 200, setHeader() {}, end: (body) => (res.statusCode === 200 ? resolve(JSON.parse(body)) : reject(new Error(body))) }
    Promise.resolve(handler({ url: `/api/${fn}`, method: 'GET', headers: {} }, res)).catch(reject)
  })
}

const n = (v, dp = 0) => (v == null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }))
const sign = (v, dp = 2) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(dp)}`)

const [nq, btc] = await Promise.allSettled([get('nq'), get('btc')])

if (nq.status === 'fulfilled') {
  const { level: l, meta, zero_dte: z, flows, expected_moves: em } = nq.value
  const dist = (v) => (v == null ? '' : `  (${sign(v - l.price, 0)} pts)`)
  console.log(`NQ ${n(l.price, 2)} · QQQ ${n(l.price_qqq, 2)} (spot via ${meta.spot_basis}, rácio ${meta.ratio ?? '—'}) · ${l.as_of_utc}`)
  console.log(`  GEX total      ${sign(l.gex_total_b)}B  ${l.gex_regime}`)
  console.log(`  Call Wall      ${l.call_wall_ref ?? '—'}${dist(l.call_wall)}`)
  console.log(`  Put Wall       ${l.put_wall_ref ?? '—'}${dist(l.put_wall)}`)
  console.log(`  Zero-gamma     ${l.zero_gamma_ref ?? '—'}${dist(l.zero_gamma)}`)
  if (z) console.log(`  0DTE (${z.expiry})  wall ${l.dte0_dominant_ref}${dist(z.gamma_wall)} · GEX ${sign(z.gex_total_b)}B · put support ${z.put_support_qqq ?? '—'} · call resistance ${z.call_resistance_qqq ?? '—'}`)
  console.log(`  Max pain ${nq.value.max_pain_qqq} QQQ (${nq.value.max_pain_expiry}) · P/C OI ${nq.value.pcr_oi} · P/C vol ${nq.value.pcr_volume}`)
  console.log(`  Vanna ${sign(flows.vanna_per_volpt_b)}B por -1pt de IV · Charm ${sign(flows.charm_per_day_b)}B por dia`)
  if (em[0]) console.log(`  Expected move até ${em[0].expiry}: ±${n(em[0].sigma_move * (meta.ratio ?? 1))} ${meta.ratio ? 'pts' : 'QQQ'} (IV ${em[0].atm_iv}%)`)
  console.log(`  VIX ${l.vix ?? '—'} (${l.vix_reading ?? '—'}) · IV30 QQQ ${meta.iv30 ?? '—'}%`)
} else {
  console.error(`NQ: ${nq.reason.message}`)
}

if (btc.status === 'fulfilled') {
  const { level: l, meta } = btc.value
  const dist = (v) => (v == null ? '' : `  (${sign(v - l.price, 0)} $)`)
  console.log(`\nBTC $${n(l.price)} · ${l.as_of_utc}`)
  console.log(`  GEX total      ${sign(l.gex_total_b, 3)}B  ${l.gex_regime}`)
  console.log(`  Call Wall      $${n(l.call_wall)}${dist(l.call_wall)}`)
  console.log(`  Put Wall       $${n(l.put_wall)}${dist(l.put_wall)}`)
  console.log(`  Zero-gamma     $${n(l.zero_gamma)}${dist(l.zero_gamma)}`)
  console.log(`  Max pain $${n(btc.value.max_pain)} (${btc.value.max_pain_expiry}) · P/C OI ${btc.value.pcr_oi} · DVOL ${meta.dvol ?? '—'} · funding 8h ${meta.funding_8h_pct ?? '—'}%`)
} else {
  console.error(`BTC: ${btc.reason.message}`)
}

process.exit(nq.status === 'fulfilled' || btc.status === 'fulfilled' ? 0 : 1)
