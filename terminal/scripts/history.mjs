// History kept next to the snapshots: one compact row of levels per run, and
// one volatility snapshot per trading day. Pure functions; snapshot.mjs does
// the file I/O.

const HOUR = 3600
const DAY = 24 * HOUR
const r = (v, dp) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** dp) / 10 ** dp)

export function levelsRow(nq, btc, t) {
  const row = { t }
  if (nq?.level) {
    const l = nq.level
    row.nq = {
      p: r(l.price, 0),
      q: r(l.price_qqq, 2),
      gex: r(l.gex_total_b, 3),
      zg: r(l.zero_gamma_qqq, 1),
      cw: l.call_wall_qqq ?? null,
      pw: l.put_wall_qqq ?? null,
      w0: nq.zero_dte?.gamma_wall_qqq ?? null,
      vix: l.vix ?? null,
      iv: r(nq.meta?.iv30, 1),
    }
  }
  if (btc?.level) {
    const l = btc.level
    row.btc = { p: r(l.price, 0), gex: r(l.gex_total_b, 3), zg: l.zero_gamma ?? null, cw: l.call_wall ?? null, pw: l.put_wall ?? null, dvol: btc.meta?.dvol ?? null, f: btc.meta?.funding_8h_pct ?? null }
  }
  return row
}

// Full resolution for the last 3 days, hourly up to 30 days, 4-hourly up to
// 120 days: keeps the file small enough to load on every visit.
export function thin(rows, nowS) {
  const seen = new Set()
  return rows
    .filter((row) => nowS - row.t <= 120 * DAY)
    .sort((a, b) => a.t - b.t)
    .filter((row) => {
      const age = nowS - row.t
      if (age <= 3 * DAY) return true
      const bucket = Math.floor(row.t / (age <= 30 * DAY ? HOUR : 4 * HOUR))
      if (seen.has(bucket)) return false
      seen.add(bucket)
      return true
    })
}

export function appendLevels(history, row, nowS) {
  const rows = (history?.rows ?? []).filter((x) => Math.abs(x.t - row.t) >= 60)
  if (row.nq || row.btc) rows.push(row)
  return { rows: thin(rows, nowS) }
}

const nyDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(ms))

export function volDay(vol, t) {
  return {
    t,
    spot: vol.iv_term?.spot ?? null,
    term: (vol.iv_term?.rows ?? []).map((x) => [x.dte, x.atm_iv, x.rr25 ?? null]),
    skew_expiry: vol.iv_skew?.expiry ?? null,
    skew: (vol.iv_skew?.rows ?? []).map((x) => [x.moneyness_pct, x.iv]),
  }
}

// One entry per New York date (the latest run of that day wins), last 20 days.
export function appendVol(history, vol, nowMs) {
  const days = { ...(history?.days ?? {}) }
  const entry = volDay(vol, Math.floor(nowMs / 1000))
  if (entry.term.length) days[nyDate(nowMs)] = entry
  const keep = Object.keys(days).sort().slice(-20)
  return { days: Object.fromEntries(keep.map((d) => [d, days[d]])) }
}
