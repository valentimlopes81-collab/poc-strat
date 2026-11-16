import { describe, expect, it } from 'vitest'
import { detectAlerts, type AlertSnapshot } from '../src/lib/autoAlerts'

const snap = (price: number, over: Partial<AlertSnapshot> = {}): AlertSnapshot => ({
  asset: 'NQ',
  time: '2026-11-16T15:00:00Z',
  price,
  gex: -3,
  near: 30,
  unit: 'pts',
  levels: [
    { name: 'Put Wall', value: 27600, label: '670 QQQ' },
    { name: 'Zero-gamma', value: 28100, label: '682 QQQ' },
  ],
  ...over,
})

describe('detectAlerts', () => {
  it('says nothing when price just drifts away from every level', () => {
    expect(detectAlerts(snap(27800), snap(27820))).toEqual([])
  })

  it('flags entering the proximity window once, not while staying inside it', () => {
    const entered = detectAlerts(snap(27650), snap(27620))
    expect(entered).toHaveLength(1)
    expect(entered[0]).toMatchObject({ severity: 'notable', auto: true, asset: 'NQ' })
    expect(entered[0].title).toContain('Put Wall')
    expect(detectAlerts(snap(27620), snap(27615))).toEqual([])
  })

  it('flags a cross even when price jumped straight over the proximity window', () => {
    const [a] = detectAlerts(snap(27700), snap(27400))
    expect(a.severity).toBe('critical')
    expect(a.title).toBe('Preço cruzou o Put Wall para baixo')
  })

  it('flags a regime flip', () => {
    const [a] = detectAlerts(snap(27800), snap(27800, { gex: 0.4 }))
    expect(a.severity).toBe('critical')
    expect(a.title).toContain('GEX virou positivo')
  })

  it('reports a wall that moved instead of a false cross against the old one', () => {
    const next = snap(27650, { levels: [{ name: 'Put Wall', value: 27800, label: '675 QQQ' }, { name: 'Zero-gamma', value: 28100, label: '682 QQQ' }] })
    const alerts = detectAlerts(snap(27650), next)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].title).toBe('Put Wall mudou para 675 QQQ')
  })

  it('ignores the small continuous drift of zero-gamma', () => {
    const next = snap(27800, { levels: [{ name: 'Put Wall', value: 27600, label: '670 QQQ' }, { name: 'Zero-gamma', value: 28120, label: '682.5 QQQ' }] })
    expect(detectAlerts(snap(27800), next)).toEqual([])
  })

  it('uses the asset own distance and unit', () => {
    const btc = (price: number): AlertSnapshot => ({ asset: 'BTC', time: 't', price, gex: -0.1, near: 300, unit: '$', levels: [{ name: 'Put Wall', value: 64000, label: '$64.000' }] })
    const [a] = detectAlerts(btc(64500), btc(64250))
    expect(a.title).toBe('Preço a $250 do Put Wall')
  })
})
