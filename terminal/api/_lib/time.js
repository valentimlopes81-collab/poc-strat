const NY = 'America/New_York'
export const YEAR_MS = 365.25 * 24 * 3600 * 1000
export const DAY_MS = 24 * 3600 * 1000

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: NY,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function nyParts(ms) {
  const p = {}
  for (const part of partsFmt.formatToParts(new Date(ms))) p[part.type] = part.value
  return p
}

// Offset of New York from UTC at the given instant, in ms (negative).
function nyOffsetMs(ms) {
  const p = nyParts(ms)
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000
}

export function nyWallToUtcMs(y, mo, d, h = 0, mi = 0, s = 0) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  return guess - nyOffsetMs(guess)
}

// "2026-11-16T12:19:39" (New York wall clock, no zone) -> UTC ms
export function parseNyNaive(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso ?? '')
  if (!m) return null
  return nyWallToUtcMs(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0))
}

export function nyDateStr(ms) {
  const p = nyParts(ms)
  return `${p.year}-${p.month}-${p.day}`
}

// US equity options stop trading at 16:00 New York on expiry day.
export function expiryCloseUtcMs(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return nyWallToUtcMs(y, mo, d, 16, 0, 0)
}

export function daysBetween(fromDateStr, toDateStr) {
  return Math.round((Date.parse(`${toDateStr}T00:00:00Z`) - Date.parse(`${fromDateStr}T00:00:00Z`)) / DAY_MS)
}
