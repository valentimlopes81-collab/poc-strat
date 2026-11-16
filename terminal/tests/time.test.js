import { describe, expect, it } from 'vitest'
import { daysBetween, expiryCloseUtcMs, nyDateStr, nyWallToUtcMs, parseNyNaive } from '../api/_lib/time.js'

const iso = (ms) => new Date(ms).toISOString()

describe('New York wall clock to UTC', () => {
  it('uses UTC-5 in winter', () => {
    expect(iso(nyWallToUtcMs(2026, 11, 16, 9, 30))).toBe('2026-11-16T14:30:00.000Z')
    expect(iso(parseNyNaive('2026-11-16T12:19:39'))).toBe('2026-11-16T17:19:39.000Z')
  })
  it('uses UTC-4 in summer', () => {
    expect(iso(nyWallToUtcMs(2026, 7, 15, 9, 30))).toBe('2026-07-15T13:30:00.000Z')
    expect(iso(parseNyNaive('2026-07-15 16:00'))).toBe('2026-07-15T20:00:00.000Z')
  })
  it('returns null for something that is not a timestamp', () => {
    expect(parseNyNaive('n/a')).toBeNull()
    expect(parseNyNaive(undefined)).toBeNull()
  })
})

describe('expiry close', () => {
  it('is 16:00 New York on the expiry date, whatever the season', () => {
    expect(iso(expiryCloseUtcMs('2026-11-20'))).toBe('2026-11-20T21:00:00.000Z')
    expect(iso(expiryCloseUtcMs('2026-06-19'))).toBe('2026-06-19T20:00:00.000Z')
  })
})

describe('dates', () => {
  it('nyDateStr is the New York calendar date, not the UTC one', () => {
    expect(nyDateStr(Date.parse('2026-11-17T02:00:00Z'))).toBe('2026-11-16')
    expect(nyDateStr(Date.parse('2026-11-17T06:00:00Z'))).toBe('2026-11-17')
  })
  it('daysBetween counts calendar days', () => {
    expect(daysBetween('2026-11-16', '2026-11-16')).toBe(0)
    expect(daysBetween('2026-11-16', '2026-12-11')).toBe(25)
  })
})
