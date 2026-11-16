import { useMemo } from 'react'
import { EquityChart } from '../components/EquityChart'
import { Panel, PanelGrid, StatRow } from '../components/Panel'
import { TradeLog } from '../components/TradeLog'
import { WinLossBars } from '../components/WinLossBars'
import { computePerf } from '../lib/perfStats'
import { fmtUsd, useJson } from '../lib/useJson'
import type { AccountRow, TradeRow } from '../types'

// the journal stores dd/mm only; every trade so far is from this year
const JOURNAL_YEAR = 2026

function BarRow({ label, value, max, text }: { label: string; value: number; max: number; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] tabular-nums py-px">
      <span className="w-10 text-term-muted">{label}</span>
      <div className="flex-1 h-3 flex bg-black/40">
        <div className="flex-1 flex justify-end">{value < 0 && <div className="h-full bg-term-red" style={{ width: `${(Math.abs(value) / max) * 100}%` }} />}</div>
        <div className="w-px bg-term-border" />
        <div className="flex-1">{value > 0 && <div className="h-full bg-term-green" style={{ width: `${(value / max) * 100}%` }} />}</div>
      </div>
      <span className="w-40 text-right text-term-text whitespace-nowrap">{text}</span>
    </div>
  )
}

export default function PerfTab({ trades }: { trades: TradeRow[] | null }) {
  const account = useJson<AccountRow[]>('/data/account.json')
  const stats = useMemo(() => (trades ? computePerf(trades, JOURNAL_YEAR) : null), [trades])
  const maxDay = Math.max(1, ...(stats?.byWeekday ?? []).map((d) => Math.abs(d.pnl)))
  const maxSide = Math.max(1, ...(stats?.bySide ?? []).map((d) => Math.abs(d.pnl)))
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

      {stats && (
        <PanelGrid cols={3}>
          <Panel title="Estatísticas" src={`${stats.count} trades`}>
            <StatRow label="Expectativa por trade" value={fmtUsd(stats.expectancy)} valueClass={stats.expectancy >= 0 ? 'text-term-green' : 'text-term-red'} />
            <StatRow label="R médio" value={stats.avgR != null ? `${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R` : '—'} />
            <StatRow label="Média win / loss" value={`${fmtUsd(stats.avgWin)} / ${fmtUsd(stats.avgLoss)}`} />
            <StatRow label="Profit factor" value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : '—'} />
            <StatRow label="Max drawdown" value={fmtUsd(-stats.maxDrawdown)} valueClass="text-term-red" />
            <StatRow label="Maior série · wins / losses" value={`${stats.longestWinStreak} / ${stats.longestLossStreak}`} />
            <p className="mt-2 text-[10px] text-term-muted">
              Com win rate de {(stats.winRate * 100).toFixed(0)}%, o break-even exige um win médio de pelo menos{' '}
              {stats.winRate > 0 ? ((1 - stats.winRate) / stats.winRate).toFixed(1) : '—'}× o loss médio; o real é{' '}
              {stats.avgLoss ? Math.abs(stats.avgWin / stats.avgLoss).toFixed(1) : '—'}×.
            </p>
          </Panel>
          <Panel title="Long vs Short" src="P&L e win rate por direção">
            {stats.bySide.map((d) => (
              <BarRow key={d.label} label={d.label} value={d.pnl} max={maxSide} text={`${fmtUsd(d.pnl)} · ${(d.winRate * 100).toFixed(0)}% · ${d.count}`} />
            ))}
            <p className="mt-2 text-[10px] text-term-muted">P&L · win rate · nº de trades</p>
          </Panel>
          <Panel title="Por dia da semana" src="P&L acumulado">
            {stats.byWeekday.map((d) => (
              <BarRow key={d.label} label={d.label} value={d.pnl} max={maxDay} text={`${fmtUsd(d.pnl)} · ${d.count}`} />
            ))}
            <p className="mt-2 text-[10px] text-term-muted">P&L · nº de trades</p>
          </Panel>
        </PanelGrid>
      )}

      <Panel title="Trade log" src="clica num cabeçalho para ordenar">
        {trades && <TradeLog trades={trades} />}
      </Panel>
    </>
  )
}
