import { Badge } from './Panel'
import type { ScorecardRow } from '../types'

export function ScorecardTable({ rows }: { rows: ScorecardRow[] }) {
  const tone = (v: ScorecardRow['verdict']) => (v === 'Confirmado' ? 'ok' : v === 'Parcial' ? 'warn' : v === 'Falhou' ? 'bad' : null)
  return (
    <div className="max-h-[280px] overflow-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-term-muted uppercase text-[10px] tracking-wide">
            <th className="text-left py-1 sticky top-0 bg-term-panel">Data</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Ativo</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Bias</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Confiança</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Veredicto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const t = tone(r.verdict)
            return (
              <tr key={i} className="border-t border-term-border">
                <td className="py-1 pr-2 whitespace-nowrap">{r.date}</td>
                <td className="py-1 pr-2 whitespace-nowrap">{r.asset}</td>
                <td className="py-1 pr-2 text-term-text/90">{r.bias}</td>
                <td className="py-1 pr-2 whitespace-nowrap text-term-muted">{r.confidence}</td>
                <td className="py-1">{t ? <Badge tone={t}>{r.verdict}</Badge> : r.verdict}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
