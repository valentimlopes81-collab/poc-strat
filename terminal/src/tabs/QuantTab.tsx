import { useMemo } from 'react'
import type { CrossData, MacroData, VolView } from '../api'
import { CotBar } from '../components/CotBar'
import { AssetPerformance, CorrMatrix, RollingCorrelation, VolModels } from '../components/CrossAsset'
import { EconCalendar } from '../components/EconCalendar'
import { FomcList } from '../components/FomcList'
import { GammaByExpiry } from '../components/GammaByExpiry'
import { GexHeatmap } from '../components/GexHeatmap'
import { IvSkew } from '../components/IvSkew'
import { LevelHistory } from '../components/LevelHistory'
import { IvSurface3D } from '../components/IvSurface3D'
import { IvTermStructure } from '../components/IvTermStructure'
import { LineChart, SERIES_COLORS } from '../components/LineChart'
import { Panel, PanelGrid, StatRow } from '../components/Panel'
import { ScorecardTable } from '../components/ScorecardTable'
import type { HistoryRow, VolDay } from '../lib/history'
import { fmtInt } from '../lib/levels'
import { useJson } from '../lib/useJson'
import { useLive } from '../lib/useLive'
import type { CotRow, EconEvent, FomcRow, ScorecardRow } from '../types'

const VOL_POLL_MS = 5 * 60_000

type CotHistory = NonNullable<MacroData['cot']>['history']
const ZERO = [{ value: 0, label: 'neutro' }]
const fmtContracts = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v / 1000)}K`

// The most recent saved day that is not the day of the live data.
function previousVolDay(days: Record<string, VolDay> | undefined, liveAsOf: string | undefined) {
  if (!days || !liveAsOf) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(liveAsOf))
  const key = Object.keys(days)
    .sort()
    .filter((d) => d < today)
    .at(-1)
  if (!key) return null
  const day = days[key]
  const label = `${key.slice(8)}/${key.slice(5, 7)}`
  const byExpiry = new Map<string, number>()
  for (const [dte, iv] of day.term) {
    const expiry = new Date(Date.parse(`${key}T00:00:00Z`) + dte * 86_400_000).toISOString().slice(0, 10)
    byExpiry.set(expiry, iv)
  }
  return { label, byExpiry, skew: { label: `${label} (mesma maturidade)`, points: day.skew } }
}

export default function QuantTab({
  cot,
  cotHistory,
  econ,
  history,
}: {
  cot: CotRow[] | null
  cotHistory: CotHistory | null
  econ: EconEvent[] | null
  history: HistoryRow[]
}) {
  const volHistory = useJson<{ days: Record<string, VolDay> }>('/data/history/vol.json')
  const cotSeries = useMemo(
    () =>
      cotHistory
        ? [
            { label: 'Leveraged funds (especulativo)', color: SERIES_COLORS[0], data: cotHistory.map((h) => ({ time: h.time, value: h.lf_net })) },
            { label: 'Asset managers (institucional)', color: SERIES_COLORS[1], data: cotHistory.map((h) => ({ time: h.time, value: h.am_net })) },
          ]
        : [],
    [cotHistory],
  )
  const fomc = useJson<FomcRow[]>('/data/fomc.json')
  const scorecard = useJson<ScorecardRow[]>('/data/scorecard.json')
  const cross = useLive<CrossData>('/api/cross', { fallback: '/data/snap/cross.json', intervalMs: 15 * 60_000 })
  const nqVol = useLive<VolView>('/api/nq?view=vol', { fallback: '/data/snap/nq_vol.json', intervalMs: VOL_POLL_MS })
  const btcVol = useLive<VolView>('/api/btc?view=vol', { fallback: '/data/snap/btc_vol.json', intervalMs: VOL_POLL_MS })
  const c = cot?.[0]
  const nv = nqVol.data
  const bv = btcVol.data
  const x = cross.data
  const prevVol = useMemo(() => previousVolDay(volHistory.data?.days, nv?.as_of_utc), [volHistory.data, nv?.as_of_utc])

  return (
    <>
      <PanelGrid cols={3}>
        {c && (
          <Panel title="COT Nasdaq-100" src="CFTC · leveraged funds">
            <StatRow label="Report week" value={c.report_date} />
            <CotBar cot={c} />
            <StatRow label="Net" value={`${c.lf_net >= 0 ? '+' : ''}${c.lf_net.toLocaleString('en-US')}`} valueClass={c.lf_net >= 0 ? 'text-term-green' : 'text-term-red'} />
            {c.lf_net_prev != null && (
              <StatRow label="Variação vs semana anterior" value={`${c.lf_net - c.lf_net_prev >= 0 ? '+' : ''}${(c.lf_net - c.lf_net_prev).toLocaleString('en-US')}`} />
            )}
            <p className="mt-2 text-[12px] leading-relaxed">{c.reading}</p>
          </Panel>
        )}
        {fomc.data && (
          <Panel title="FOMC" src="Federal Reserve">
            <FomcList fomc={fomc.data} />
          </Panel>
        )}
        {econ && (
          <Panel title="Calendário Macro" src="ForexFactory · hora local">
            <EconCalendar events={econ} />
          </Panel>
        )}
        {scorecard.data && (
          <Panel title="Scorecard da bias diária" src="quant_bias_scorecard.md" span2>
            <ScorecardTable rows={scorecard.data} />
          </Panel>
        )}
        {cotSeries.length > 0 && (
          <Panel title="COT · Posição líquida" src="contratos · 60 semanas">
            <LineChart series={cotSeries} refLines={ZERO} format={fmtContracts} height={200} />
          </Panel>
        )}
      </PanelGrid>

      {x && (
        <PanelGrid cols={3}>
          <Panel title="Cross-asset · Desempenho" src="fechos diários · Yahoo">
            <AssetPerformance data={x} />
          </Panel>
          <Panel title="Cross-asset · Matriz de correlação">
            <CorrMatrix data={x} />
          </Panel>
          <Panel title="NQ · Correlação móvel" src={`${x.roll_window} dias`}>
            <RollingCorrelation data={x} />
          </Panel>
        </PanelGrid>
      )}

      <PanelGrid>
        <Panel title="Histórico de GEX e níveis" src="hora local">
          <LevelHistory rows={history} />
        </Panel>
      </PanelGrid>

      {(nv || bv) && (
        <PanelGrid cols={2}>
          {nv && (
            <Panel title="NQ · GEX Heatmap" src="strike QQQ × expiração · Cboe">
              <GammaByExpiry data={nv.heatmap} />
              <GexHeatmap data={nv.heatmap} fmtStrike={(s) => s.toFixed(0)} />
            </Panel>
          )}
          {bv && (
            <Panel title="BTC · GEX Heatmap" src="strike × expiração · Deribit">
              <GammaByExpiry data={bv.heatmap} />
              <GexHeatmap data={bv.heatmap} fmtStrike={(s) => `$${fmtInt(s)}`} />
            </Panel>
          )}
        </PanelGrid>
      )}

      {nv?.iv_surface && (
        <PanelGrid>
          <Panel title="NQ · IV Surface 3D" src="QQQ · strike × expiração · lado OTM">
            <IvSurface3D data={nv.iv_surface} />
          </Panel>
        </PanelGrid>
      )}

      <PanelGrid cols={3}>
        {nv && (
          <Panel title="NQ · IV Term Structure" src="QQQ · ATM por expiração">
            <IvTermStructure data={nv.iv_term} previous={prevVol} />
          </Panel>
        )}
        {nv?.iv_skew.expiry && (
          <Panel title="NQ · IV Skew" src={`QQQ · exp. ${nv.iv_skew.expiry.slice(5)}`}>
            <IvSkew data={{ ...nv.iv_skew, expiry: nv.iv_skew.expiry }} previous={prevVol?.skew} />
          </Panel>
        )}
        {x && (
          <Panel title="NQ · Vol realizada vs prevista vs implícita" src="NQ=F diário · IV30 QQQ">
            <VolModels data={x} />
          </Panel>
        )}
      </PanelGrid>

      {bv && (
        <PanelGrid cols={2}>
          <Panel title="BTC · IV Term Structure" src="Deribit · ATM por expiração">
            <IvTermStructure data={bv.iv_term} />
          </Panel>
          {bv.iv_skew.expiry && (
            <Panel title="BTC · IV Skew" src={`Deribit · exp. ${bv.iv_skew.expiry.slice(5)}`}>
              <IvSkew data={{ ...bv.iv_skew, expiry: bv.iv_skew.expiry }} />
            </Panel>
          )}
        </PanelGrid>
      )}
    </>
  )
}
