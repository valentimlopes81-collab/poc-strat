import type { ExpectedMove as Move } from '../api'

/**
 * ±1σ range the options are pricing until each expiry, around the current
 * price. `toDisplay` converts the chain's price unit into the one shown.
 */
export function ExpectedMove({ moves, spot, toDisplay, fmtMove }: { moves: Move[]; spot: number; toDisplay: (v: number) => number; fmtMove: (v: string) => string }) {
  const rows = moves.filter((m) => m.sigma_move != null && m.upper != null && m.lower != null)
  if (!rows.length) return <div className="text-[11px] text-term-muted py-3">Sem dados.</div>
  const widest = Math.max(...rows.map((m) => m.sigma_move as number))
  const fmt = (v: number) => Math.round(toDisplay(v)).toLocaleString('en-US')

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((m) => {
        const half = ((m.sigma_move as number) / widest) * 50
        const pct = ((m.sigma_move as number) / spot) * 100
        return (
          <div key={m.expiry}>
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-term-text">
                {m.dte === 0 ? 'Até ao fecho de hoje' : `Até ${m.expiry.slice(8)}/${m.expiry.slice(5, 7)}`}
                <span className="text-term-muted ml-1.5">{m.dte}d · IV {m.atm_iv?.toFixed(1)}%</span>
              </span>
              <span className="tabular-nums font-semibold">
                ±{fmtMove(Math.round(toDisplay(m.sigma_move as number)).toLocaleString('en-US'))}
                <span className="text-term-muted font-normal ml-1.5">±{pct.toFixed(2)}%</span>
              </span>
            </div>
            <div className="relative h-3 mt-1 bg-black/40">
              <div className="absolute inset-y-0 bg-term-amber/35" style={{ left: `${50 - half}%`, width: `${half * 2}%` }} />
              <div className="absolute inset-y-0 w-px bg-term-text" style={{ left: '50%' }} />
            </div>
            <div className="text-center text-[10px] text-term-muted tabular-nums mt-0.5">
              {fmt(m.lower as number)} — {fmt(m.upper as number)}
            </div>
          </div>
        )
      })}
      <p className="text-[10px] text-term-muted">
        Intervalo de 1 desvio-padrão implícito na IV ATM de cada expiração (~68% de probabilidade teórica de fechar dentro). Não tem direção.
      </p>
    </div>
  )
}
