// GET /api/macro -> this week's macro calendar (ForexFactory public feed) and
// Nasdaq-100 positioning from the CFTC Commitments of Traders report, with a
// year of history. Both change slowly, so the CDN keeps them for an hour (the
// calendar feed also rate-limits hard).

import { getJson, optional, sendError, sendJson } from './_lib/http.js'

const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
// Traders in Financial Futures, futures and options combined; 209742 = E-mini Nasdaq-100
const COT_URL = 'https://publicreporting.cftc.gov/resource/yw9f-hn96.json'

export function filterCalendar(events) {
  return (events ?? [])
    .filter((e) => (e.country === 'USD' || e.country === 'All') && ['High', 'Medium', 'Holiday'].includes(e.impact))
    .map((e) => ({ title: e.title, country: e.country, date: e.date, impact: e.impact, forecast: e.forecast ?? '', previous: e.previous ?? '' }))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}

export function buildCot(rows) {
  const parsed = (rows ?? [])
    .map((r) => {
      const lfLong = Number(r.lev_money_positions_long)
      const lfShort = Number(r.lev_money_positions_short)
      const amLong = Number(r.asset_mgr_positions_long)
      const amShort = Number(r.asset_mgr_positions_short)
      return {
        report_week: r.yyyy_report_week_ww,
        report_date: String(r.report_date_as_yyyy_mm_dd).slice(0, 10),
        open_interest_all: Number(r.open_interest_all),
        lf_long: lfLong,
        lf_short: lfShort,
        lf_net: lfLong - lfShort,
        am_long: amLong,
        am_short: amShort,
        am_net: amLong - amShort,
      }
    })
    .filter((r) => Number.isFinite(r.lf_net) && r.report_date.length === 10)
    .sort((a, b) => (a.report_date < b.report_date ? -1 : 1))
  const latest = parsed.at(-1)
  if (!latest) return null
  const prev = parsed.at(-2)
  const reading =
    latest.lf_net > 0
      ? 'Leveraged funds net LONG — posicionamento especulativo favorece alta'
      : latest.lf_net < 0
        ? 'Leveraged funds net SHORT — posicionamento especulativo favorece baixa'
        : 'Leveraged funds neutros'
  return {
    latest: {
      ...latest,
      lf_net_pct_oi: latest.open_interest_all ? Math.round((latest.lf_net / latest.open_interest_all) * 1000) / 10 : null,
      lf_net_prev: prev?.lf_net ?? null,
      reading,
    },
    history: parsed.map((r) => ({ time: Date.parse(`${r.report_date}T00:00:00Z`) / 1000, lf_net: r.lf_net, am_net: r.am_net })),
  }
}

async function fetchCot() {
  const params = new URLSearchParams({
    cftc_contract_market_code: '209742',
    $order: 'report_date_as_yyyy_mm_dd DESC',
    $limit: '60',
    $select:
      'report_date_as_yyyy_mm_dd,yyyy_report_week_ww,open_interest_all,lev_money_positions_long,lev_money_positions_short,asset_mgr_positions_long,asset_mgr_positions_short',
  })
  return buildCot(await getJson(`${COT_URL}?${params}`))
}

export default async function handler(_req, res) {
  try {
    const [calendar, cot] = await Promise.all([optional(getJson(CALENDAR_URL)), optional(fetchCot())])
    if (!calendar && !cot) throw new Error('Calendário e COT indisponíveis')
    sendJson(res, { as_of_utc: new Date().toISOString().slice(0, 19) + 'Z', calendar: calendar ? filterCalendar(calendar) : null, cot }, { sMaxAge: 3600, swr: 6 * 3600 })
  } catch (err) {
    sendError(res, err)
  }
}
