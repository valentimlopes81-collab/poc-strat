import type { VolView } from '../api'
import { CotBar } from '../components/CotBar'
import { EconCalendar } from '../components/EconCalendar'
import { FomcList } from '../components/FomcList'
import { GammaByExpiry } from '../components/GammaByExpiry'
import { GexHeatmap } from '../components/GexHeatmap'
import { IvSkew } from '../components/IvSkew'
import { IvSurface3D } from '../components/IvSurface3D'
import { IvTermStructure } from '../components/IvTermStructure'
import { Panel, PanelGrid, StatRow } from '../components/Panel'
import { ScorecardTable } from '../components/ScorecardTable'
import { VolCompare } from '../components/VolCompare'
import { fmtInt } from '../lib/levels'
import { useJson } from '../lib/useJson'
import { useLive } from '../lib/useLive'
import type { CotRow, EconEvent, FomcRow, ScorecardRow, VolCompareData } from '../types'

const VOL_POLL_MS = 5 * 60_000

export default function QuantTab({ cot, econ }: { cot: CotRow[] | null; econ: EconEvent[] | null }) {
  const fomc = useJson<FomcRow[]>('/data/fomc.json')
  const scorecard = useJson<ScorecardRow[]>('/data/scorecard.json')
  const volCompare = useJson<VolCompareData>('/data/vol_compare_nq.json')
  const nqVol = useLive<VolView>('/api/nq?view=vol', { fallback: '/data/snap/nq_vol.json', intervalMs: VOL_POLL_MS })
  const btcVol = useLive<VolView>('/api/btc?view=vol', { fallback: '/data/snap/btc_vol.json', intervalMs: VOL_POLL_MS })
  const c = cot?.[0]
  const nv = nqVol.data
  const bv = btcVol.data

  return (
    <>
      <PanelGrid cols={3}>
        {c && (
          <Panel title="COT Nasdaq-100" src="CFTC · leveraged funds">
            <StatRow label="Report week" value={c.report_date} />
            <CotBar cot={c} />
            <StatRow label="Net" value={`${c.lf_net >= 0 ? '+' : ''}${c.lf_net.toLocaleString('en-US')}`} valueClass={c.lf_net >= 0 ? 'text-term-green' : 'text-term-red'} />
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
            <IvTermStructure data={nv.iv_term} />
          </Panel>
        )}
        {nv?.iv_skew.expiry && (
          <Panel title="NQ · IV Skew" src={`QQQ · exp. ${nv.iv_skew.expiry.slice(5)}`}>
            <IvSkew data={{ ...nv.iv_skew, expiry: nv.iv_skew.expiry }} />
          </Panel>
        )}
        {volCompare.data && (
          <Panel title="NQ · Realized vs Implied Vol" src="QQQ">
            <VolCompare data={volCompare.data} />
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
