import { lazy, Suspense } from 'react'
import type { BtcCore, MacroData, NqCore } from './api'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LiveStatus } from './components/LiveStatus'
import { NextEvent } from './components/NextEvent'
import { TickerTape } from './components/TickerTape'
import { useLevelHistory, type HistoryRow } from './lib/history'
import { useJson } from './lib/useJson'
import { useLive } from './lib/useLive'
import { oneOf, usePersistentState } from './lib/usePersistentState'
import { HojeTab } from './tabs/HojeTab'
import type { AlertRow, CotRow, EconEvent, LevelRow, TradeRow } from './types'

const QuantTab = lazy(() => import('./tabs/QuantTab'))
const PerfTab = lazy(() => import('./tabs/PerfTab'))

type Tab = 'hoje' | 'quant' | 'perf'
const isTab = oneOf<Tab>('hoje', 'quant', 'perf')
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'quant', label: 'Quant' },
  { id: 'perf', label: 'Performance' },
]

export default function App() {
  const [tab, setTab] = usePersistentState<Tab>('tab', 'hoje', isTab)

  const nq = useLive<NqCore>('/api/nq', { fallback: '/data/snap/nq.json' })
  const btc = useLive<BtcCore>('/api/btc', { fallback: '/data/snap/btc.json' })
  const narrative = useJson<LevelRow[]>('/data/levels.json')
  const macro = useLive<MacroData>('/api/macro', { fallback: '/data/snap/macro.json', intervalMs: 30 * 60_000 })
  // last export of the slower Python job, shown until (or if) the live copy arrives
  const cotStatic = useJson<CotRow[]>('/data/cot.json')
  const econStatic = useJson<EconEvent[]>('/data/econ_calendar.json')
  const cot = macro.data?.cot ? [macro.data.cot.latest] : cotStatic.data
  const econ = macro.data?.calendar ?? econStatic.data
  const alerts = useJson<AlertRow[]>('/data/alerts.json')
  const trades = useJson<TradeRow[]>('/data/trades.json')
  const savedHistory = useJson<{ rows: HistoryRow[] }>('/data/history/levels.json')
  const history = useLevelHistory(savedHistory.data?.rows ?? null, nq.source === 'live' ? nq.data : null, btc.source === 'live' ? btc.data : null)

  return (
    <div className="min-h-screen bg-term-bg text-term-text font-mono text-[13px] p-3 md:p-4 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-term-border pb-2 mb-3">
        <div className="text-base font-bold tracking-wide">
          <span className="text-term-amber">NQ</span>/<span className="text-term-amber">BTC</span> TERMINAL
        </div>
        <TickerTape nq={nq.data} btc={btc.data} cot={cot} />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <nav className="inline-flex border border-term-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-[11px] uppercase tracking-wider font-semibold border-r border-term-border last:border-r-0 ${
                tab === t.id ? 'bg-term-amber text-black' : 'bg-term-panel text-term-muted hover:text-term-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <NextEvent events={econ} />
        <LiveStatus
          feeds={[
            { label: 'NQ', source: nq.source, asOf: nq.data?.level.as_of_utc, error: nq.error },
            { label: 'BTC', source: btc.source, asOf: btc.data?.level.as_of_utc, error: btc.error },
          ]}
        />
      </div>

      <ErrorBoundary label={TABS.find((t) => t.id === tab)?.label ?? ''} key={tab}>
        <Suspense fallback={<div className="text-[11px] text-term-muted py-6">A carregar…</div>}>
          {tab === 'hoje' && <HojeTab nq={nq} btc={btc} narrative={narrative.data} alerts={alerts.data} econ={econ} trades={trades.data} />}
          {tab === 'quant' && <QuantTab cot={cot} cotHistory={macro.data?.cot?.history ?? null} econ={econ} history={history} />}
          {tab === 'perf' && <PerfTab trades={trades.data} />}
        </Suspense>
      </ErrorBoundary>

      <footer className="mt-4 pt-2 border-t border-term-border text-[10px] text-term-muted">
        NQ/BTC Terminal · níveis e preços calculados ao vivo a cada minuto (opções QQQ via Cboe com 15 min de atraso, NQ=F via Yahoo, BTC via Deribit/Kraken) · bias,
        scorecard e alertas são julgamento manual · poc-strat
      </footer>
    </div>
  )
}
