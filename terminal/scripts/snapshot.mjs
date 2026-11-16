// Saves the current output of the live API functions as static JSON under
// public/data/snap/. The site falls back to these when the API is unreachable,
// and the data-refresh workflow runs this on a schedule.
//
// Usage: node scripts/snapshot.mjs   (from terminal/)

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'public/data/snap')

const TARGETS = [
  ['nq', '/api/nq', 'nq.json'],
  ['nq', '/api/nq?view=vol', 'nq_vol.json'],
  ['btc', '/api/btc', 'btc.json'],
  ['btc', '/api/btc?view=vol', 'btc_vol.json'],
  ['candles', '/api/candles?symbol=nq&tf=5m', 'candles_nq_5m.json'],
  ['candles', '/api/candles?symbol=btc&tf=1h', 'candles_btc_1h.json'],
  ['cross', '/api/cross', 'cross.json'],
  ['macro', '/api/macro', 'macro.json'],
]

function call(handler, url) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      end: (body) => (res.statusCode === 200 ? resolve(body) : reject(new Error(`${res.statusCode}: ${body}`))),
    }
    Promise.resolve(handler({ url, method: 'GET', headers: {} }, res)).catch(reject)
  })
}

fs.mkdirSync(outDir, { recursive: true })
let failed = 0
for (const [fn, url, file] of TARGETS) {
  try {
    const { default: handler } = await import(pathToFileURL(path.join(root, 'api', `${fn}.js`)).href)
    const body = await call(handler, url)
    fs.writeFileSync(path.join(outDir, file), body)
    console.log(`ok   ${file} (${(body.length / 1024).toFixed(0)} KB)`)
  } catch (err) {
    // keep the previous snapshot: an old copy is a better fallback than none
    failed++
    console.error(`FAIL ${file}: ${err.message}`)
  }
}
process.exit(failed === TARGETS.length ? 1 : 0)
