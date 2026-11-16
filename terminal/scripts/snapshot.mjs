// Saves the current output of the live API functions as static JSON under
// public/data/snap/. The site falls back to these when the API is unreachable,
// and the data-refresh workflow runs this on a schedule.
//
// Usage: node scripts/snapshot.mjs   (from terminal/)

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { appendLevels, appendVol, levelsRow } from './history.mjs'

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

const historyDir = path.join(root, 'public/data/history')
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(historyDir, { recursive: true })
let failed = 0
const fresh = {}
for (const [fn, url, file] of TARGETS) {
  try {
    const { default: handler } = await import(pathToFileURL(path.join(root, 'api', `${fn}.js`)).href)
    const body = await call(handler, url)
    fs.writeFileSync(path.join(outDir, file), body)
    fresh[file] = JSON.parse(body)
    console.log(`ok   ${file} (${(body.length / 1024).toFixed(0)} KB)`)
  } catch (err) {
    // keep the previous snapshot: an old copy is a better fallback than none
    failed++
    console.error(`FAIL ${file}: ${err.message}`)
  }
}

// history only ever grows from data fetched in this run, never from a stale snapshot
const now = Date.now()
const nowS = Math.floor(now / 1000)
if (fresh['nq.json'] || fresh['btc.json']) {
  const file = path.join(historyDir, 'levels.json')
  const next = appendLevels(readJson(file), levelsRow(fresh['nq.json'], fresh['btc.json'], nowS), nowS)
  fs.writeFileSync(file, JSON.stringify(next))
  console.log(`ok   history/levels.json (${next.rows.length} rows)`)
}
if (fresh['nq_vol.json']) {
  const file = path.join(historyDir, 'vol.json')
  const next = appendVol(readJson(file), fresh['nq_vol.json'], now)
  fs.writeFileSync(file, JSON.stringify(next))
  console.log(`ok   history/vol.json (${Object.keys(next.days).length} days)`)
}
process.exit(failed === TARGETS.length ? 1 : 0)
