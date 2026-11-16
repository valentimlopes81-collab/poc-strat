const NY = 'America/New_York'

const nyFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: NY,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function nyOffsetMs(ms: number): number {
  const p: Record<string, string> = {}
  for (const part of nyFmt.formatToParts(new Date(ms))) p[part.type] = part.value
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000
}

/** New York wall clock on the given UTC calendar day -> epoch seconds. `hour` may exceed 24. */
export function nyHourToEpoch(dayStartUtcS: number, hour: number): number {
  const guess = dayStartUtcS * 1000 + hour * 3600_000
  return (guess - nyOffsetMs(guess)) / 1000
}

const localTime = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' })
const localDay = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' })
const localMonth = new Intl.DateTimeFormat('pt-PT', { month: 'short' })
const localFull = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const fmtLocalTime = (epochS: number) => localTime.format(epochS * 1000)
export const fmtLocalDay = (epochS: number) => localDay.format(epochS * 1000)
export const fmtLocalMonth = (epochS: number) => localMonth.format(epochS * 1000)
export const fmtLocalFull = (epochS: number) => localFull.format(epochS * 1000)

/** "2h 05m", "12m", "45s" */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ${String(m % 60).padStart(2, '0')}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}
