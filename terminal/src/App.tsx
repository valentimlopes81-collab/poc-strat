import { useState } from 'react'
import { useJson, fmtUsd } from './lib/useJson'
import { Panel, StatRow, Badge } from './components/Panel'
import { TickerTape } from './components/TickerTape'
import { GexDepthChart } from './components/GexDepthChart'
import { EquityChart } from './components/EquityChart'
import { WinLossBars } from './components/WinLossBars'
import { CotBar } from './components/CotBar'
import { FomcList } from './components/FomcList'
import { ScorecardTable } from './components/ScorecardTable'
import { TradeLog } from './components/TradeLog'
import { EconCalendar } from './components/EconCalendar'
import { PriceChart, type Candle, type PriceLevel, type TradeMarker } from './components/PriceChart'
import { VixChart } from './components/VixChart'
import { VolumeChart } from './components/VolumeChart'
import { GexHeatmap, type HeatmapData } from './components/GexHeatmap'
import { GammaByExpiry } from './components/GammaByExpiry'
import { AlertsFeed } from './components/AlertsFeed'
import { PlanoDoDia } from './components/PlanoDoDia'
import { IvTermStructure } from './components/IvTermStructure'
import { IvSkew } from './components/IvSkew'
import { VolCompare } from './components/VolCompare'
import type {
  LevelRow,
  GexStrikeRow,
  CotRow,
  FomcRow,
  ScorecardRow,
  AccountRow,
  TradeRow,
  EconEvent,
  AlertRow,
  IvTermData,
  IvSkewData,
  VolCompareData,
} from './types'

type Tab = 'hoje' | 'quant' | 'perf'

function buildTradeMarkers(trades: TradeRow[] | null, dailyCandles: Candle[] | null): TradeMarker[] {
  if (!trades || !dailyCandles || !dailyCandles.length) return []
  const byDate = new Map(dailyCandles.map((c) => [new Date(c.time * 1000).toISOString().slice(5, 10), c.time]))
  const markers: TradeMarker[] = []
  for (const t of trades) {
    const [dd, mm] = t.date.split('/')
    if (!dd || !mm) continue
    const key = `${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    const time = byDate.get(key)
    if (time == null) continue
    markers.push({ time, result: t.result, label: `${t.id} ${t.pnl_usd >= 0 ? '+' : ''}${t.pnl_usd.toFixed(0)}` })
  }
  return markers
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-[11px] uppercase tracking-wider font-semibold border-r border-term-border last:border-r-0 ${
        active ? 'bg-term-amber text-black' : 'bg-term-panel text-term-muted hover:text-term-text'
      }`}
    >
      {children}
    </button>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('hoje')

  const levels = useJson<LevelRow[]>('/data/levels.json')
  const gexStrikes = useJson<GexStrikeRow[]>('/data/gex_strikes.json')
  const cot = useJson<CotRow[]>('/data/cot.json')
  const fomc = useJson<FomcRow[]>('/data/fomc.json')
  const scorecard = useJson<ScorecardRow[]>('/data/scorecard.json')
  const account = useJson<AccountRow[]>('/data/account.json')
  const trades = useJson<TradeRow[]>('/data/trades.json')
  const econ = useJson<EconEvent[]>('/data/econ_calendar.json')
  const priceNq = useJson<Candle[]>('/data/price_nq.json')
  const priceNqDaily = useJson<Candle[]>('/data/price_nq_daily.json')
  const priceBtc = useJson<Candle[]>('/data/price_btc.json')
  const [nqTimeframe, setNqTimeframe] = useState<'intraday' | 'daily'>('intraday')
  const vixHistory = useJson<{ time: number; value: number }[]>('/data/vix_history.json')
  const heatmapNq = useJson<HeatmapData>('/data/gex_heatmap_nq.json')
  const heatmapBtc = useJson<HeatmapData>('/data/gex_heatmap_btc.json')
  const ivTermNq = useJson<IvTermData>('/data/iv_term_nq.json')
  const ivSkewNq = useJson<IvSkewData>('/data/iv_skew_nq.json')
  const volCompareNq = useJson<VolCompareData>('/data/vol_compare_nq.json')
  const alerts = useJson<AlertRow[]>('/data/alerts.json')

  const nq = levels.data?.find((r) => r.asset === 'NQ') ?? null
  const btc = levels.data?.find((r) => r.asset === 'BTC') ?? null
  const nqStrikes = gexStrikes.data?.filter((r) => r.asset === 'NQ') ?? []
  const tradeMarkers = buildTradeMarkers(trades.data, priceNqDaily.data)
  const btcStrikes = gexStrikes.data?.filter((r) => r.asset === 'BTC') ?? []

  const stats = (() => {
    if (!trades.data) return null
    const wins = trades.data.filter((t) => t.result === 'Win')
    const losses = trades.data.filter((t) => t.result === 'Loss')
    const be = trades.data.filter((t) => t.result === 'BE')
    const sum = (arr: TradeRow[]) => arr.reduce((a, t) => a + (Number(t.pnl_usd) || 0), 0)
    const grossWin = sum(wins)
    const grossLoss = Math.abs(sum(losses))
    return {
      wins: wins.length,
      losses: losses.length,
      be: be.length,
      winRate: trades.data.length ? wins.length / trades.data.length : 0,
      avgWin: wins.length ? grossWin / wins.length : 0,
      avgLoss: losses.length ? sum(losses) / losses.length : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
      totalPnl: sum(trades.data),
    }
  })()

  const pnlRow = account.data?.find((r) => r.metric === 'pnl')
  const balRow = account.data?.find((r) => r.metric === 'current_balance')
  const targetRow = account.data?.find((r) => r.metric === 'target')
  const remainRow = account.data?.find((r) => r.metric === 'remaining_to_target')
  const targetPct =
    targetRow && remainRow && targetRow.value ? Math.max(0, Math.min(100, (100 * (targetRow.value - remainRow.value)) / targetRow.value)) : 0

  return (
    <div className="min-h-screen bg-term-bg text-term-text font-mono text-[13px] p-3 md:p-4 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-term-border pb-2 mb-3">
        <div className="text-base font-bold tracking-wide flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-term-green animate-pulse" />
          <span className="text-term-amber">NQ</span>/<span className="text-term-amber">BTC</span> TERMINAL
        </div>
        <TickerTape levels={levels.data} cot={cot.data} />
      </header>

      <nav className="inline-flex border border-term-border mb-3">
        <TabButton active={tab === 'hoje'} onClick={() => setTab('hoje')}>
          Hoje
        </TabButton>
        <TabButton active={tab === 'quant'} onClick={() => setTab('quant')}>
          Quant
        </TabButton>
        <TabButton active={tab === 'perf'} onClick={() => setTab('perf')}>
          Performance
        </TabButton>
      </nav>

      {tab === 'hoje' && (
        <>
          {levels.data && (
            <div className="grid grid-cols-1 gap-px bg-term-border border border-term-border mb-px">
              <Panel title="Plano do Dia" src="bias + cenários — julgamento manual, nunca sinal de entrada">
                <PlanoDoDia levels={levels.data} />
              </Panel>
            </div>
          )}
          {alerts.data && (
            <div className="grid grid-cols-1 gap-px bg-term-border border border-term-border mb-px">
              <Panel title="Alertas · Killzone" src="GEX/níveis — notável quando muda estrutura ou preço se aproxima">
                <AlertsFeed alerts={alerts.data} />
              </Panel>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-term-border border border-term-border mb-px">
            {nq && priceNq.data && priceNqDaily.data && (
              <Panel
                title="NQ · Preço + Confluências"
                src={`${nqTimeframe === 'intraday' ? 'QQQ 5m (hoje)' : 'QQQ 1D (120d)'} · Call Wall / Put Wall / Zero-gamma`}
                right={
                  <div className="flex border border-term-border text-[10px]">
                    <button
                      onClick={() => setNqTimeframe('intraday')}
                      className={`px-2 py-0.5 ${nqTimeframe === 'intraday' ? 'bg-term-amber text-black font-bold' : 'text-term-muted'}`}
                    >
                      Intradiário
                    </button>
                    <button
                      onClick={() => setNqTimeframe('daily')}
                      className={`px-2 py-0.5 border-l border-term-border ${nqTimeframe === 'daily' ? 'bg-term-amber text-black font-bold' : 'text-term-muted'}`}
                    >
                      Diário
                    </button>
                  </div>
                }
              >
                <PriceChart
                  candles={nqTimeframe === 'intraday' ? priceNq.data : priceNqDaily.data}
                  levels={
                    [
                      nq.call_wall_qqq != null && { value: nq.call_wall_qqq, color: '#00d964', title: 'Call Wall' },
                      nq.zero_gamma_qqq != null && { value: nq.zero_gamma_qqq, color: '#ff9f1c', title: 'Zero-γ', dashed: true },
                      nq.put_wall_qqq != null && { value: nq.put_wall_qqq, color: '#ff3b30', title: 'Put Wall' },
                    ].filter(Boolean) as PriceLevel[]
                  }
                  tradeMarkers={nqTimeframe === 'daily' ? tradeMarkers : undefined}
                />
                <div className="mt-1 text-[9px] text-term-muted uppercase tracking-wide">Volume</div>
                <VolumeChart
                  data={(nqTimeframe === 'intraday' ? priceNq.data : priceNqDaily.data).map((c) => ({
                    time: c.time,
                    value: c.volume ?? 0,
                    color: c.close >= c.open ? '#00d96488' : '#ff3b3088',
                  }))}
                  height={56}
                />
                {nqTimeframe === 'intraday' && (
                  <>
                    <div className="mt-1 text-[9px] text-term-muted uppercase tracking-wide">Order flow opções (calls − puts)</div>
                    <VolumeChart
                      data={priceNq.data.map((c) => {
                        const delta = (c.calls_volume ?? 0) - (c.puts_volume ?? 0)
                        return { time: c.time, value: delta, color: delta >= 0 ? '#00d964' : '#ff3b30' }
                      })}
                      height={56}
                    />
                  </>
                )}
              </Panel>
            )}
            {btc && priceBtc.data && (
              <Panel title="BTC · Preço + Confluências" src="1h (30d) · Call Wall / Put Wall / Zero-gamma">
                <PriceChart
                  candles={priceBtc.data}
                  levels={[
                    { value: btc.call_wall, color: '#00d964', title: 'Call Wall' },
                    { value: btc.zero_gamma, color: '#ff9f1c', title: 'Zero-γ', dashed: true },
                    { value: btc.put_wall, color: '#ff3b30', title: 'Put Wall' },
                  ]}
                />
                <div className="mt-1 text-[9px] text-term-muted uppercase tracking-wide">Volume</div>
                <VolumeChart
                  data={priceBtc.data.map((c) => ({
                    time: c.time,
                    value: c.volume ?? 0,
                    color: c.close >= c.open ? '#00d96488' : '#ff3b3088',
                  }))}
                  height={56}
                />
              </Panel>
            )}
          </div>
          {vixHistory.data && (
            <div className="grid grid-cols-1 gap-px bg-term-border border border-term-border mb-px">
              <Panel title="VIX · Volatilidade" src="60 dias · linhas de referência em 20 e 30">
                <VixChart data={vixHistory.data} height={110} />
              </Panel>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-term-border border border-term-border mb-px">
            {nq && (
              <Panel
                title="NQ · Gamma Exposure"
                right={<Badge tone={nq.gex_total_b >= 0 ? 'ok' : 'bad'}>{nq.gex_total_b >= 0 ? 'GEX+' : 'GEX−'}</Badge>}
              >
                <StatRow label="Preço" value={nq.price_ref} />
                <StatRow label="GEX total" value={`${nq.gex_total_b.toFixed(2)}B`} valueClass={nq.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'} />
                <StatRow label="Call Wall" value={nq.call_wall_ref ?? '—'} />
                <StatRow label="Put Wall" value={nq.put_wall_ref ?? '—'} />
                <StatRow label="Zero-gamma" value={nq.zero_gamma_ref ?? '—'} />
                <StatRow label="VIX" value={nq.vix != null ? `${nq.vix.toFixed(2)} (${nq.vix_reading})` : '—'} />
                <div className="mt-2">
                  <GexDepthChart rows={nqStrikes} priceVal={nq.price_qqq ?? null} fmtStrike={(s) => `${s.toFixed(0)} QQQ`} />
                </div>
              </Panel>
            )}
            {btc && (
              <Panel
                title="BTC · Gamma Exposure"
                right={<Badge tone={btc.gex_total_b >= 0 ? 'ok' : 'bad'}>{btc.gex_total_b >= 0 ? 'GEX+' : 'GEX−'}</Badge>}
              >
                <StatRow label="Preço" value={`$${btc.price.toLocaleString('en-US')}`} />
                <StatRow
                  label="GEX total"
                  value={`${btc.gex_total_b >= 0 ? '+' : ''}${btc.gex_total_b.toFixed(3)}B`}
                  valueClass={btc.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'}
                />
                <StatRow label="Call Wall" value={`$${btc.call_wall.toLocaleString('en-US')}`} />
                <StatRow label="Put Wall" value={`$${btc.put_wall.toLocaleString('en-US')}`} />
                <StatRow label="Zero-gamma" value={`$${btc.zero_gamma.toLocaleString('en-US')}`} />
                <div className="mt-2">
                  <GexDepthChart rows={btcStrikes} priceVal={btc.price} fmtStrike={(s) => `$${s.toLocaleString('en-US')}`} />
                </div>
              </Panel>
            )}
          </div>
          <p className="text-[11px] text-term-muted">Níveis de contexto apenas — nunca um sinal de entrada. Atualizados manualmente a cada check.</p>
        </>
      )}

      {tab === 'quant' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-term-border border border-term-border">
          {cot.data?.[0] && (
            <Panel title="COT Nasdaq-100" src="CFTC · leveraged funds">
              <StatRow label="Report week" value={cot.data[0].report_date} />
              <CotBar cot={cot.data[0]} />
              <StatRow
                label="Net"
                value={`${cot.data[0].lf_net >= 0 ? '+' : ''}${cot.data[0].lf_net.toLocaleString('en-US')}`}
                valueClass={cot.data[0].lf_net >= 0 ? 'text-term-green' : 'text-term-red'}
              />
              <p className="mt-2 text-[12px] leading-relaxed">{cot.data[0].reading}</p>
            </Panel>
          )}
          {fomc.data && (
            <Panel title="FOMC" src="Federal Reserve">
              <FomcList fomc={fomc.data} />
            </Panel>
          )}
          {econ.data && (
            <Panel title="Calendário Macro" src="ForexFactory">
              <EconCalendar events={econ.data} />
            </Panel>
          )}
          {scorecard.data && (
            <Panel title="Scorecard da bias diária" src="quant_bias_scorecard.md" span2>
              <ScorecardTable rows={scorecard.data} />
            </Panel>
          )}
        </div>
      )}

      {tab === 'quant' && (heatmapNq.data || heatmapBtc.data) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-term-border border border-term-border mt-px">
          {heatmapNq.data && (
            <Panel title="NQ · GEX Heatmap" src="strike × expiração · Cboe/OpenBB">
              <GammaByExpiry data={heatmapNq.data} />
              <GexHeatmap data={heatmapNq.data} fmtStrike={(s) => s.toFixed(0)} />
            </Panel>
          )}
          {heatmapBtc.data && (
            <Panel title="BTC · GEX Heatmap" src="strike × expiração · Deribit">
              <GammaByExpiry data={heatmapBtc.data} />
              <GexHeatmap data={heatmapBtc.data} fmtStrike={(s) => `$${s.toLocaleString('en-US')}`} />
            </Panel>
          )}
        </div>
      )}

      {tab === 'quant' && (ivTermNq.data || ivSkewNq.data || volCompareNq.data) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-term-border border border-term-border mt-px">
          {ivTermNq.data && (
            <Panel title="NQ · IV Term Structure" src="QQQ · ATM por expiração">
              <IvTermStructure data={ivTermNq.data} />
            </Panel>
          )}
          {ivSkewNq.data && (
            <Panel title="NQ · IV Skew" src={`QQQ · exp. ${ivSkewNq.data.expiry.slice(5)}`}>
              <IvSkew data={ivSkewNq.data} />
            </Panel>
          )}
          {volCompareNq.data && (
            <Panel title="NQ · Realized vs Implied Vol" src="QQQ">
              <VolCompare data={volCompareNq.data} />
            </Panel>
          )}
        </div>
      )}

      {tab === 'perf' && (
        <>
          <div className="border border-term-red/60 bg-term-red/10 px-3 py-2 mb-3 text-[12px]">
            <b className="text-term-red">🔒 CONTA ENCERRADA — 06/11</b> · Balance final $24.000,00 (P&amp;L −$1.000,00, exatamente o Max DD,
            deliberado). Fase seguinte: paper trade até ao fim do semestre.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-term-border border border-term-border mb-px">
            <Panel title="Balance final">
              <div className="text-xl font-bold tabular-nums">${balRow?.value.toLocaleString('en-US')}</div>
            </Panel>
            <Panel title="P&L final">
              <div className={`text-xl font-bold tabular-nums ${(pnlRow?.value ?? 0) < 0 ? 'text-term-red' : 'text-term-green'}`}>
                {fmtUsd(pnlRow?.value)}
              </div>
            </Panel>
            <Panel title="Win rate">
              <div className="text-xl font-bold tabular-nums">{stats ? `${(stats.winRate * 100).toFixed(0)}%` : '—'}</div>
            </Panel>
            <Panel title={`Target (falta $${remainRow?.value.toLocaleString('en-US')})`}>
              <div className="text-xl font-bold tabular-nums">${targetRow?.value.toLocaleString('en-US')}</div>
              <div className="h-1 bg-term-border mt-1">
                <div className="h-full bg-term-amber" style={{ width: `${targetPct}%` }} />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-term-border border border-term-border mb-px">
            <Panel title="Equity curve" src="P&L acumulado, L1–L37" span2>
              {trades.data && <EquityChart trades={trades.data} />}
            </Panel>
            <Panel title="Resultado por trade">{trades.data && <WinLossBars trades={trades.data} />}</Panel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-term-border border border-term-border mb-px">
            <Panel title="Média por resultado">
              <StatRow label="Média win" value={fmtUsd(stats?.avgWin)} valueClass="text-term-green" />
              <StatRow label="Média loss" value={fmtUsd(stats?.avgLoss)} valueClass="text-term-red" />
              <StatRow label="Profit factor" value={stats?.profitFactor != null ? stats.profitFactor.toFixed(2) : '—'} />
            </Panel>
          </div>

          <Panel title="Trade log" src="clica num cabeçalho para ordenar">
            {trades.data && <TradeLog trades={trades.data} />}
          </Panel>
        </>
      )}

      <footer className="mt-4 pt-2 border-t border-term-border text-[10px] text-term-muted">
        NQ/BTC Terminal · preços/GEX/VIX/calendário auto-atualizados (GitHub Action) · bias, scorecard e alertas continuam a ser julgamento manual · poc-strat
      </footer>
    </div>
  )
}
