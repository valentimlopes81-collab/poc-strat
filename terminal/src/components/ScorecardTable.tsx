import { Badge } from './Panel'
import { usePanelFullscreen } from '../lib/panelFullscreen'
import type { ScorecardRow } from '../types'

export function ScorecardTable({ rows }: { rows: ScorecardRow[] }) {
  const isFull = usePanelFullscreen()
  const tone = (v: ScorecardRow['verdict']) => (v === 'Confirmado' ? 'ok' : v === 'Parcial' ? 'warn' : v === 'Falhou' ? 'bad' : null)
  return (
    <div className="overflow-auto" style={{ maxHeight: isFull ? '75vh' : 280 }}>
      <table className="w-full table-fixed text-[11px] border-collapse">
        <colgroup>
          <col className="w-[12%]" />
          <col className="w-[9%]" />
          <col className="w-[37%]" />
          <col className="w-[16%]" />
          <col className="w-[26%]" />
        </colgroup>
        <thead>
          <tr className="text-term-muted uppercase text-[10px] tracking-wide">
            <th className="text-left py-1 sticky top-0 bg-term-panel">Data</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Ativo</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Bias</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Conf.</th>
            <th className="text-left py-1 sticky top-0 bg-term-panel">Veredicto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const t = tone(r.verdict)
            return (
              <tr key={i} className="border-t border-term-border">
                <td className="py-1 pr-1 whitespace-nowrap">{r.date}</td>
                <td className="py-1 pr-1 whitespace-nowrap">{r.asset}</td>
                <td className="py-1 pr-2 text-term-text/90 break-words">{r.bias}</td>
                <td className="py-1 pr-1 text-term-muted break-words">{r.confidence}</td>
                <td className="py-1 break-words">{t ? <Badge tone={t}>{r.verdict}</Badge> : r.verdict}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
