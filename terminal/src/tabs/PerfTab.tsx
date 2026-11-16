import { EquityChart } from '../components/EquityChart'
import { Panel, PanelGrid, StatRow } from '../components/Panel'
import { TradeLog } from '../components/TradeLog'
import { WinLossBars } from '../components/WinLossBars'
import { fmtUsd, useJson } from '../lib/useJson'
import type { AccountRow, TradeRow } from '../types'

function summarize(trades: TradeRow[]) {
  const wins = trades.filter((t) => t.result === 'Win')
  const losses = trades.filter((t) => t.result === 'Loss')
  const sum = (arr: TradeRow[]) => arr.reduce((a, t) => a + (Number(t.pnl_usd) || 0), 0)
  const grossWin = sum(wins)
  const grossLoss = Math.abs(sum(losses))
  return {
    winRate: trades.length ? wins.length / trades.length : 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? sum(losses) / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
  }
}

export default function PerfTab({ trades }: { trades: TradeRow[] | null }) {
  const account = useJson<AccountRow[]>('/data/account.json')
  const stats = trades ? summarize(trades) : null
  const row = (metric: string) => account.data?.find((r) => r.metric === metric)
  const pnl = row('pnl')
  const bal = row('current_balance')
  const target = row('target')
  const remain = row('remaining_to_target')
  const targetPct = target && remain && target.value ? Math.max(0, Math.min(100, (100 * (target.value - remain.value)) / target.value)) : 0

  return (
    <>
      <div className="border border-term-red/60 bg-term-red/10 px-3 py-2 mb-3 text-[12px]">
        <b className="text-term-red">🔒 CONTA ENCERRADA — 06/11</b> · Balance final $24.000,00 (P&amp;L −$1.000,00, exatamente o Max DD, deliberado). Fase seguinte: paper
        trade até ao fim do semestre.
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-term-border border border-term-border mb-px">
        <Panel title="Balance final">
          <div className="text-xl font-bold">${bal?.value.toLocaleString('en-US')}</div>
        </Panel>
        <Panel title="P&L final">
          <div className={`text-xl font-bold ${(pnl?.value ?? 0) < 0 ? 'text-term-red' : 'text-term-green'}`}>{fmtUsd(pnl?.value)}</div>
        </Panel>
        <Panel title="Win rate">
          <div className="text-xl font-bold">{stats ? `${(stats.winRate * 100).toFixed(0)}%` : '—'}</div>
        </Panel>
        <Panel title={`Target (falta $${remain?.value.toLocaleString('en-US')})`}>
          <div className="text-xl font-bold">${target?.value.toLocaleString('en-US')}</div>
          <div className="h-1 bg-term-border mt-1">
            <div className="h-full bg-term-amber" style={{ width: `${targetPct}%` }} />
          </div>
        </Panel>
      </div>

      <PanelGrid cols={3}>
        <Panel title="Equity curve" src="P&L acumulado por trade" span2>
          {trades && <EquityChart trades={trades} />}
        </Panel>
        <Panel title="Resultado por trade">{trades && <WinLossBars trades={trades} />}</Panel>
      </PanelGrid>

      <PanelGrid cols={3}>
        <Panel title="Média por resultado">
          <StatRow label="Média win" value={fmtUsd(stats?.avgWin)} valueClass="text-term-green" />
          <StatRow label="Média loss" value={fmtUsd(stats?.avgLoss)} valueClass="text-term-red" />
          <StatRow label="Profit factor" value={stats?.profitFactor != null ? stats.profitFactor.toFixed(2) : '—'} />
        </Panel>
      </PanelGrid>

      <Panel title="Trade log" src="clica num cabeçalho para ordenar">
        {trades && <TradeLog trades={trades} />}
      </Panel>
    </>
  )
}
