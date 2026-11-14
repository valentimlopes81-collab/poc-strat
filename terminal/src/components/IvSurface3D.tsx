import { useMemo } from 'react'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import type { IvSurfaceData } from '../types'

const COS_A = Math.cos(Math.PI / 6)
const SIN_A = Math.sin(Math.PI / 6)
const STEP_X = 24
const STEP_Y = 13
const Z_SCALE = 7.5
const MAX_STRIKE_LINES = 18
const PAD = 28

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function lerpColor(hex1: string, hex2: string, t: number) {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`
}
function colorForIv(iv: number, min: number, max: number) {
  const t = max > min ? (iv - min) / (max - min) : 0.5
  if (t < 0.5) return lerpColor('#4fc3f7', '#ff9f1c', t * 2)
  return lerpColor('#ff9f1c', '#ff3b30', (t - 0.5) * 2)
}

export function IvSurface3D({ data }: { data: IvSurfaceData }) {
  const isFull = usePanelFullscreen()

  const { strikes, grid, ivMin, ivMax, expiries, atmIdx } = useMemo(() => {
    const strikeSet = new Set(data.rows.map((r) => r.strike))
    const allStrikes = Array.from(strikeSet).sort((a, b) => a - b)
    const stride = Math.max(1, Math.ceil(allStrikes.length / MAX_STRIKE_LINES))
    const strikes = allStrikes.filter((_, i) => i % stride === 0)

    const map = new Map<string, number>()
    let ivMin = Infinity
    let ivMax = -Infinity
    for (const r of data.rows) {
      map.set(`${r.expiry}|${r.strike}`, r.iv)
      if (r.iv < ivMin) ivMin = r.iv
      if (r.iv > ivMax) ivMax = r.iv
    }
    const expiries = data.expiries
    const grid = expiries.map((e) => strikes.map((s) => map.get(`${e.expiry}|${s}`)))
    let atmIdx = 0
    let bestDist = Infinity
    strikes.forEach((s, i) => {
      const d = Math.abs(s - data.spot)
      if (d < bestDist) {
        bestDist = d
        atmIdx = i
      }
    })
    return { strikes, grid, ivMin: ivMin === Infinity ? 0 : ivMin, ivMax: ivMax === -Infinity ? 1 : ivMax, expiries, atmIdx }
  }, [data])

  if (!strikes.length || !expiries.length) return null

  // projeta em coordenadas "cruas" (sem offset) primeiro, para depois
  // calcular o bounding box real e so entao definir o viewBox -- assim o
  // mesh preenche sempre o painel, seja qual for a gama de strikes/expiracoes
  const projectRaw = (xi: number, yi: number, iv: number) => {
    const x = (xi - yi) * COS_A * STEP_X
    const y = (xi + yi) * SIN_A * STEP_Y - (iv - ivMin) * Z_SCALE
    return [x, y] as const
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  grid.forEach((row, yi) => {
    row.forEach((iv, xi) => {
      if (iv == null) return
      const [x, y] = projectRaw(xi, yi, iv)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    })
  })
  const vbX = minX - PAD
  const vbY = minY - PAD
  const vbW = maxX - minX + PAD * 2
  const vbH = maxY - minY + PAD * 2

  const project = (xi: number, yi: number, iv: number) => projectRaw(xi, yi, iv)

  // linhas ao longo do eixo strike (uma por expiracao) e do eixo expiracao
  // (uma por strike), cada segmento colorido pela media de IV dos extremos
  const coloredStrikeLines: { d: string; color: string }[] = []
  grid.forEach((row, yi) => {
    for (let xi = 0; xi < row.length - 1; xi++) {
      const a = row[xi]
      const b = row[xi + 1]
      if (a == null || b == null) continue
      const [x1, y1] = project(xi, yi, a)
      const [x2, y2] = project(xi + 1, yi, b)
      coloredStrikeLines.push({ d: `M ${x1} ${y1} L ${x2} ${y2}`, color: colorForIv((a + b) / 2, ivMin, ivMax) })
    }
  })
  const coloredExpiryLines: { d: string; color: string }[] = []
  for (let xi = 0; xi < strikes.length; xi++) {
    for (let yi = 0; yi < grid.length - 1; yi++) {
      const a = grid[yi][xi]
      const b = grid[yi + 1][xi]
      if (a == null || b == null) continue
      const [x1, y1] = project(xi, yi, a)
      const [x2, y2] = project(xi, yi + 1, b)
      coloredExpiryLines.push({ d: `M ${x1} ${y1} L ${x2} ${y2}`, color: colorForIv((a + b) / 2, ivMin, ivMax) })
    }
  }

  // linha ATM (strike mais perto do spot) ao longo de todas as expiracoes
  const atmPath: string[] = []
  grid.forEach((row, yi) => {
    const iv = row[atmIdx]
    if (iv == null) return
    const [x, y] = project(atmIdx, yi, iv)
    atmPath.push(`${yi === 0 || grid[yi - 1]?.[atmIdx] == null ? 'M' : 'L'} ${x} ${y}`)
  })

  const legendStops = 6

  return (
    <div style={{ maxHeight: isFull ? '75vh' : undefined }}>
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="w-full" style={{ height: isFull ? 480 : 300 }}>
        {coloredExpiryLines.map((l, i) => (
          <path key={`e${i}`} d={l.d} stroke={l.color} strokeWidth={1} fill="none" opacity={0.55} />
        ))}
        {coloredStrikeLines.map((l, i) => (
          <path key={`s${i}`} d={l.d} stroke={l.color} strokeWidth={1.3} fill="none" />
        ))}
        {atmPath.length > 1 && <path d={atmPath.join(' ')} stroke="#ff9f1c" strokeWidth={1.5} strokeDasharray="3,2" fill="none" opacity={0.9} />}

        {/* ticks de strike (moneyness) na linha da expiracao mais proxima */}
        {strikes.map((s, xi) => {
          if (xi % 3 !== 0) return null
          const iv = grid[0][xi]
          if (iv == null) return null
          const [x, y] = project(xi, 0, iv)
          return (
            <text key={xi} x={x} y={y + 14} fontSize={8} fill="#7a7a7a" textAnchor="middle">
              {((s / data.spot - 1) * 100).toFixed(0)}%
            </text>
          )
        })}
        {/* labels de expiracao (dte) no fim de cada linha */}
        {expiries.map((e, yi) => {
          const row = grid[yi]
          let lastXi = -1
          for (let xi = row.length - 1; xi >= 0; xi--) {
            if (row[xi] != null) {
              lastXi = xi
              break
            }
          }
          if (lastXi < 0) return null
          const [x, y] = project(lastXi, yi, row[lastXi] as number)
          return (
            <text key={e.expiry} x={x + 6} y={y} fontSize={8} fill="#7a7a7a" textAnchor="start" dominantBaseline="middle">
              {e.dte}d
            </text>
          )
        })}
      </svg>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] text-term-muted">{ivMin.toFixed(0)}%</span>
        <div className="flex h-2 flex-1 max-w-[160px]">
          {Array.from({ length: legendStops }).map((_, i) => (
            <div key={i} className="flex-1" style={{ background: colorForIv(ivMin + ((ivMax - ivMin) * i) / (legendStops - 1), ivMin, ivMax) }} />
          ))}
        </div>
        <span className="text-[9px] text-term-muted">{ivMax.toFixed(0)}%</span>
        <span className="text-[9px] text-term-muted ml-auto">eixo-x: moneyness · eixo-prof.: dias até expirar · ATM tracejado</span>
      </div>
    </div>
  )
}
