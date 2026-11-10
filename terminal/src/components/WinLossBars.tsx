import type { TradeRow } from '../types'

export function WinLossBars({ trades }: { trades: TradeRow[] }) {
  const wins = trades.filter((t) => t.result === 'Win').length
  const losses = trades.filter((t) => t.result === 'Loss').length
  const be = trades.filter((t) => t.result === 'BE').length
  const max = Math.max(wins, losses, be, 1)
  const bars = [
    { k: 'WIN', v: wins, color: '#00d964' },
    { k: 'LOSS', v: losses, color: '#ff3b30' },
    { k: 'BE', v: be, color: '#7a7a7a' },
  ]
  return (
    <div className="flex items-end gap-4 h-[110px] pt-2">
      {bars.map((b) => (
        <div key={b.k} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[11px] font-semibold tabular-nums">{b.v}</span>
          <div className="w-full flex items-end justify-center" style={{ height: 70 }}>
            <div style={{ width: '60%', height: `${(b.v / max) * 100}%`, background: b.color, minHeight: b.v ? 2 : 0 }} />
          </div>
          <span className="text-[10px] text-term-muted">{b.k}</span>
        </div>
      ))}
    </div>
  )
}
