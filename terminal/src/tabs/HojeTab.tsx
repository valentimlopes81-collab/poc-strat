import { useMemo, useState } from 'react'
import type { IChartApi } from 'lightweight-charts'
import type { BtcCore, CandlesResp, NqCore, StrikeValue, Timeframe } from '../api'
import { AlertsFeed } from '../components/AlertsFeed'
import { ExpectedMove } from '../components/ExpectedMove'
import { GexDepthChart } from '../components/GexDepthChart'
import { GexProfile } from '../components/GexProfile'
import { OrderBookDepth } from '../components/OrderBookDepth'
import { Badge, Panel, PanelGrid, Segmented, StatRow } from '../components/Panel'
import { PlanoDoDia } from '../components/PlanoDoDia'
import { TradeFlow } from '../components/TradeFlow'
import { PriceChart, type EconMarker, type PriceLevel, type TradeMarker } from '../components/PriceChart'
import { VixChart } from '../components/VixChart'
import { VolumeByStrike } from '../components/VolumeByStrike'
import { VolumeChart, type VolumeBar } from '../components/VolumeChart'
import { useKraken } from '../lib/kraken'
import { fmtInt, qqqStrikeLabel, signed, withNarrative } from '../lib/levels'
import { fmtCompact } from '../lib/useJson'
import { useLive, type LiveState } from '../lib/useLive'
import { oneOf, usePersistentState } from '../lib/usePersistentState'
import type { AlertRow, EconEvent, LevelRow, TradeRow } from '../types'

const TF_OPTIONS: Array<{ value: Timeframe; label: string }> = [
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1D' },
]
const isTf = oneOf<Timeframe>('5m', '15m', '1h', '1d')
const DEFAULT_BARS: Record<Timeframe, number> = { '5m': 190, '15m': 200, '1h': 240, '1d': 130 }
const TF_SECONDS: Record<Timeframe, number> = { '5m': 300, '15m': 900, '1h': 3600, '1d': 86400 }

type Metric = 'gex' | 'dex' | 'vanna' | 'charm'
const isMetric = oneOf<Metric>('gex', 'dex', 'vanna', 'charm')
const METRICS: Array<{ value: Metric; label: string }> = [
  { value: 'gex', label: 'Gamma' },
  { value: 'dex', label: 'Delta' },
  { value: 'vanna', label: 'Vanna' },
  { value: 'charm', label: 'Charm' },
]
const METRIC_INFO: Record<Metric, { label: string; pos: string; neg: string; help: string }> = {
  gex: {
    label: 'GEX',
    pos: 'call-heavy · pin',
    neg: 'put-heavy · acelera',
    help: 'Gamma por strike: onde o hedging dos dealers trava o preço (verde) ou o acelera (vermelho).',
  },
  dex: {
    label: 'DEX',
    pos: 'pende p/ calls',
    neg: 'pende p/ puts',
    help: 'Delta do open interest por strike, em $ de subjacente. Proxy do skew direcional do OI, não da posição dos dealers.',
  },
  vanna: {
    label: 'Vanna',
    pos: 'dealers compram',
    neg: 'dealers vendem',
    help: 'Fluxo de hedge estimado por strike se a volatilidade implícita cair 1 ponto (com vol a subir, o sinal inverte).',
  },
  charm: {
    label: 'Charm',
    pos: 'dealers compram',
    neg: 'dealers vendem',
    help: 'Fluxo de hedge estimado por strike só pela passagem de 1 dia, com preço e vol parados.',
  },
}

function buildEconMarkers(events: EconEvent[] | null): EconMarker[] {
  const marks: EconMarker[] = []
  for (const e of events ?? []) {
    if (e.impact !== 'High' && e.impact !== 'Medium') continue
    const time = Math.floor(new Date(e.date).getTime() / 1000)
    if (!Number.isNaN(time)) marks.push({ time, label: e.title, impact: e.impact })
  }
  return marks
}

function buildTradeMarkers(trades: TradeRow[] | null, daily: CandlesResp['candles']): TradeMarker[] {
  if (!trades || !daily.length) return []
  const byDate = new Map(daily.map((c) => [new Date(c.time * 1000).toISOString().slice(5, 10), c.time]))
  const markers: TradeMarker[] = []
  for (const t of trades) {
    const [dd, mm] = t.date.split('/')
    if (!dd || !mm) continue
    const time = byDate.get(`${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`)
    if (time != null) markers.push({ time, result: t.result, label: `${t.id} ${t.pnl_usd >= 0 ? '+' : ''}${t.pnl_usd.toFixed(0)}` })
  }
  return markers
}

const volumeBars = (candles: CandlesResp['candles']): VolumeBar[] =>
  candles.map((c) => ({ time: c.time, value: c.volume ?? 0, color: c.close >= c.open ? '#00d96488' : '#ff3b3088' }))

function strikesFor(core: NqCore | BtcCore, metric: Metric): StrikeValue[] {
  return { gex: core.gex_strikes, dex: core.dex_strikes, vanna: core.vanna_strikes, charm: core.charm_strikes }[metric]
}

function FlowStats({ core }: { core: NqCore | BtcCore }) {
  const v = core.flows.vanna_per_volpt_b
  const c = core.flows.charm_per_day_b
  const side = (x: number) => (x >= 0 ? 'compra' : 'venda')
  return (
    <>
      {v != null && <StatRow label="Vanna · se a IV cair 1pt" value={`${signed(v)}B (${side(v)})`} valueClass={v >= 0 ? 'text-term-green' : 'text-term-red'} />}
      {c != null && <StatRow label="Charm · por dia que passa" value={`${signed(c)}B (${side(c)})`} valueClass={c >= 0 ? 'text-term-green' : 'text-term-red'} />}
    </>
  )
}

function ChartLoading({ state, height = 280 }: { state: LiveState<unknown>; height?: number }) {
  return (
    <div className="flex items-center justify-center text-[11px] text-term-muted" style={{ height }}>
      {state.error ? `Sem dados de preço: ${state.error}` : 'A carregar preço…'}
    </div>
  )
}

export function HojeTab({
  nq,
  btc,
  narrative,
  alerts,
  notify,
  onToggleNotify,
  econ,
  trades,
}: {
  nq: LiveState<NqCore>
  btc: LiveState<BtcCore>
  narrative: LevelRow[] | null
  alerts: AlertRow[]
  notify: boolean
  onToggleNotify: () => void
  econ: EconEvent[] | null
  trades: TradeRow[] | null
}) {
  const [nqTf, setNqTf] = usePersistentState<Timeframe>('nq-tf', '5m', isTf)
  const [btcTf, setBtcTf] = usePersistentState<Timeframe>('btc-tf', '1h', isTf)
  const [nqMetric, setNqMetric] = usePersistentState<Metric>('nq-metric', 'gex', isMetric)
  const [btcMetric, setBtcMetric] = usePersistentState<Metric>('btc-metric', 'gex', isMetric)
  const [nqChart, setNqChart] = useState<IChartApi | null>(null)
  const [btcChart, setBtcChart] = useState<IChartApi | null>(null)

  const nqCandles = useLive<CandlesResp>(`/api/candles?symbol=nq&tf=${nqTf}`, { fallback: nqTf === '5m' ? '/data/snap/candles_nq_5m.json' : undefined })
  const btcCandles = useLive<CandlesResp>(`/api/candles?symbol=btc&tf=${btcTf}`, { fallback: btcTf === '1h' ? '/data/snap/candles_btc_1h.json' : undefined })
  const flow = useLive<CandlesResp>(nqTf === '5m' ? '/api/candles?symbol=qqqflow' : null)
  const vix = useLive<CandlesResp>('/api/candles?symbol=vix&tf=1d', { intervalMs: 15 * 60_000 })

  const kraken = useKraken()
  const btcLive = useMemo(() => (kraken.ticker ? { price: kraken.ticker.last, barSeconds: TF_SECONDS[btcTf] } : undefined), [kraken.ticker, btcTf])

  const n = nq.data
  const b = btc.data
  const ratio = n?.meta.ratio ?? null
  const planRows = useMemo(() => {
    const rows: LevelRow[] = []
    if (n) rows.push(withNarrative(n.level, narrative))
    if (b) rows.push(withNarrative(b.level, narrative))
    return rows
  }, [n, b, narrative])

  const econMarkers = useMemo(() => buildEconMarkers(econ), [econ])
  const nqBars = nqCandles.data?.candles
  const btcBars = btcCandles.data?.candles
  const tradeMarkers = useMemo(() => (nqTf === '1d' && nqBars ? buildTradeMarkers(trades, nqBars) : undefined), [nqTf, nqBars, trades])
  const vixSeries = useMemo(() => (vix.data?.candles ?? []).map((c) => ({ time: c.time, value: c.close })), [vix.data])
  const nqVolume = useMemo(() => (nqBars ? volumeBars(nqBars) : []), [nqBars])
  const btcVolume = useMemo(() => (btcBars ? volumeBars(btcBars) : []), [btcBars])
  const flowBars = useMemo<VolumeBar[]>(() => {
    if (!nqBars || !flow.data) return []
    const byTime = new Map(flow.data.candles.map((c) => [c.time, (c.calls_volume ?? 0) - (c.puts_volume ?? 0)]))
    return nqBars.map((c) => {
      const delta = byTime.get(c.time)
      return delta == null ? { time: c.time, value: null } : { time: c.time, value: delta, color: delta >= 0 ? '#00d964' : '#ff3b30' }
    })
  }, [nqBars, flow.data])

  const nqLevels = useMemo<PriceLevel[]>(() => {
    if (!n) return []
    const l = n.level
    const out: PriceLevel[] = []
    if (l.call_wall != null) out.push({ value: l.call_wall, color: '#00d964', title: 'Call Wall' })
    if (l.zero_gamma != null) out.push({ value: l.zero_gamma, color: '#ff9f1c', title: 'Zero-γ', style: 'dashed' })
    if (l.put_wall != null) out.push({ value: l.put_wall, color: '#ff3b30', title: 'Put Wall' })
    const wall0 = n.zero_dte?.gamma_wall
    if (wall0 != null && wall0 !== l.call_wall && wall0 !== l.put_wall) out.push({ value: wall0, color: '#4fc3f7', title: '0DTE', style: 'dotted' })
    const em = n.expected_moves[0]
    if (ratio && em?.upper != null && em.lower != null && nqTf !== '1d') {
      out.push({ value: Math.round(em.upper * ratio), color: '#7a7a7a', title: 'EM+', style: 'dotted' })
      out.push({ value: Math.round(em.lower * ratio), color: '#7a7a7a', title: 'EM−', style: 'dotted' })
    }
    return out
  }, [n, ratio, nqTf])

  const btcLevels = useMemo<PriceLevel[]>(() => {
    if (!b) return []
    const l = b.level
    const out: PriceLevel[] = []
    if (l.call_wall != null) out.push({ value: l.call_wall, color: '#00d964', title: 'Call Wall' })
    if (l.zero_gamma != null) out.push({ value: l.zero_gamma, color: '#ff9f1c', title: 'Zero-γ', style: 'dashed' })
    if (l.put_wall != null) out.push({ value: l.put_wall, color: '#ff3b30', title: 'Put Wall' })
    return out
  }, [b])

  const fmtQqq = qqqStrikeLabel(ratio)
  const fmtBtc = (s: number | null) => (s == null ? '—' : `$${fmtInt(s)}`)
  const toNq = (qqq: number) => (ratio ? qqq * ratio : qqq)

  return (
    <>
      {planRows.length > 0 && (
        <PanelGrid>
          <Panel title="Plano do Dia" src="níveis ao vivo · bias e cenários são julgamento manual, nunca sinal de entrada">
            <PlanoDoDia levels={planRows} />
          </Panel>
        </PanelGrid>
      )}
      <PanelGrid>
        <Panel
          title="Alertas"
          src="manuais + automáticos (cruzamentos, proximidade <30pts, flips de regime) enquanto o terminal está aberto"
          right={
            <button
              onClick={onToggleNotify}
              className={`px-2 py-0.5 border text-[10px] whitespace-nowrap ${notify ? 'border-term-amber text-term-amber' : 'border-term-border text-term-muted hover:text-term-text'}`}
              title="Notificação do sistema e som a cada alerta automático"
            >
              {notify ? '🔔 Notificações ligadas' : '🔕 Notificações desligadas'}
            </button>
          }
        >
          <AlertsFeed alerts={alerts} />
        </Panel>
      </PanelGrid>

      <PanelGrid cols={2}>
        <Panel
          title="NQ · Preço + Confluências"
          src={`NQ=F futuros · ${nqTf === '1d' ? 'diário' : 'hora local'}${nqTf === '5m' || nqTf === '15m' ? ' · killzones' : ''}`}
          right={<Segmented options={TF_OPTIONS} value={nqTf} onChange={setNqTf} />}
        >
          {nqBars?.length ? (
            <>
              <PriceChart
                candles={nqBars}
                levels={nqLevels}
                viewKey={`nq-${nqTf}`}
                defaultBars={DEFAULT_BARS[nqTf]}
                tradeMarkers={tradeMarkers}
                killzones={nqTf === '5m' || nqTf === '15m'}
                econEvents={nqTf === '1d' ? undefined : econMarkers}
                onChartApi={setNqChart}
              />
              <div className="mt-1 text-[9px] text-term-muted uppercase tracking-wide">Volume</div>
              <VolumeChart data={nqVolume} syncWith={nqChart} />
              {nqTf === '5m' && flowBars.length > 0 && (
                <>
                  <div className="mt-1 text-[9px] text-term-muted uppercase tracking-wide">Volume de opções QQQ · calls − puts (sessão de hoje)</div>
                  <VolumeChart data={flowBars} syncWith={nqChart} />
                </>
              )}
            </>
          ) : (
            <ChartLoading state={nqCandles} />
          )}
        </Panel>
        <Panel title="BTC · Preço + Confluências" src={`Kraken · ${btcTf === '1d' ? 'diário' : 'hora local'}${kraken.status === 'live' ? ' · tick a tick' : ''}`} right={<Segmented options={TF_OPTIONS} value={btcTf} onChange={setBtcTf} />}>
          {btcBars?.length ? (
            <>
              <PriceChart candles={btcBars} levels={btcLevels} viewKey={`btc-${btcTf}`} defaultBars={DEFAULT_BARS[btcTf]} precision={1} live={btcLive} onChartApi={setBtcChart} />
              <div className="mt-1 text-[9px] text-term-muted uppercase tracking-wide">Volume</div>
              <VolumeChart data={btcVolume} syncWith={btcChart} />
            </>
          ) : (
            <ChartLoading state={btcCandles} />
          )}
        </Panel>
      </PanelGrid>

      <PanelGrid cols={2}>
        {n && (
          <Panel title="NQ · Gamma Exposure" src="opções QQQ ≤21d" right={<Badge tone={n.level.gex_total_b >= 0 ? 'ok' : 'bad'}>{n.level.gex_total_b >= 0 ? 'GEX+' : 'GEX−'}</Badge>}>
            <StatRow label="Preço" value={`NQ ${fmtInt(n.level.price)} · QQQ ${n.level.price_qqq?.toFixed(2)}`} />
            <StatRow label="GEX total" value={`${signed(n.level.gex_total_b)}B`} valueClass={n.level.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'} />
            {n.zero_dte && <StatRow label="GEX só 0DTE" value={`${signed(n.zero_dte.gex_total_b)}B`} valueClass={n.zero_dte.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'} />}
            <StatRow label="Call Wall" value={n.level.call_wall_ref ?? '—'} />
            <StatRow label="Put Wall" value={n.level.put_wall_ref ?? '—'} />
            <StatRow label="Zero-gamma" value={n.level.zero_gamma_ref ?? '—'} />
            <StatRow label={`Max pain (${n.max_pain_expiry?.slice(5) ?? '—'})`} value={n.max_pain_qqq != null ? fmtQqq(n.max_pain_qqq) : '—'} />
            <StatRow label="Put/Call · OI próx. exp. / volume hoje" value={`${n.pcr_oi?.toFixed(2) ?? '—'} / ${n.pcr_volume?.toFixed(2) ?? '—'}`} />
            <StatRow
              label="VIX · IV30 QQQ"
              value={`${n.level.vix?.toFixed(2) ?? '—'}${n.level.vix_reading ? ` (${n.level.vix_reading})` : ''} · ${n.meta.iv30?.toFixed(1) ?? '—'}%`}
            />
            <div className="mt-3 text-[10px] uppercase tracking-wide text-term-muted">Perfil de GEX · como muda o regime se o preço mexer</div>
            <GexProfile
              points={n.profile}
              spot={n.level.price_qqq ?? 0}
              fmtPrice={(p) => (ratio ? fmtInt(p * ratio) : p.toFixed(0))}
              markers={[
                ...(n.level.zero_gamma_qqq != null ? [{ value: n.level.zero_gamma_qqq, label: 'Zero-γ', color: '#ff9f1c' }] : []),
                ...(n.level.put_wall_qqq != null ? [{ value: n.level.put_wall_qqq, label: 'Put Wall', color: '#ff3b30' }] : []),
                ...(n.level.call_wall_qqq != null ? [{ value: n.level.call_wall_qqq, label: 'Call Wall', color: '#00d964' }] : []),
              ]}
            />
          </Panel>
        )}
        {b && (
          <Panel title="BTC · Gamma Exposure" src="opções Deribit ≤60d" right={<Badge tone={b.level.gex_total_b >= 0 ? 'ok' : 'bad'}>{b.level.gex_total_b >= 0 ? 'GEX+' : 'GEX−'}</Badge>}>
            <StatRow label="Preço" value={fmtBtc(b.level.price)} />
            <StatRow label="GEX total" value={`${signed(b.level.gex_total_b, 3)}B`} valueClass={b.level.gex_total_b >= 0 ? 'text-term-green' : 'text-term-red'} />
            <StatRow label="Call Wall" value={fmtBtc(b.level.call_wall)} />
            <StatRow label="Put Wall" value={fmtBtc(b.level.put_wall)} />
            <StatRow label="Zero-gamma" value={fmtBtc(b.level.zero_gamma)} />
            <StatRow label={`Max pain (${b.max_pain_expiry?.slice(5) ?? '—'})`} value={b.max_pain != null ? fmtBtc(b.max_pain) : '—'} />
            <StatRow label="Put/Call OI · próx. expiração" value={b.pcr_oi?.toFixed(2) ?? '—'} />
            <StatRow label="DVOL · vol implícita 30d" value={b.meta.dvol != null ? `${b.meta.dvol.toFixed(1)}%` : '—'} />
            <StatRow
              label="Funding perp 8h · OI perp"
              value={`${b.meta.funding_8h_pct != null ? `${signed(b.meta.funding_8h_pct, 4)}%` : '—'} · ${b.meta.perp_oi_usd != null ? `$${fmtCompact(b.meta.perp_oi_usd)}` : '—'}`}
              valueClass={(b.meta.funding_8h_pct ?? 0) >= 0 ? 'text-term-text' : 'text-term-red'}
            />
            <div className="mt-3 text-[10px] uppercase tracking-wide text-term-muted">Perfil de GEX · como muda o regime se o preço mexer</div>
            <GexProfile
              points={b.profile}
              spot={b.level.price}
              fmtPrice={(p) => `${(p / 1000).toFixed(1)}k`}
              markers={[
                ...(b.level.zero_gamma != null ? [{ value: b.level.zero_gamma, label: 'Zero-γ', color: '#ff9f1c' }] : []),
                ...(b.level.put_wall != null ? [{ value: b.level.put_wall, label: 'Put Wall', color: '#ff3b30' }] : []),
                ...(b.level.call_wall != null ? [{ value: b.level.call_wall, label: 'Call Wall', color: '#00d964' }] : []),
              ]}
            />
          </Panel>
        )}
      </PanelGrid>

      <PanelGrid cols={2}>
        {n && (
          <Panel title="NQ · Exposição por strike" src="QQQ · pontos NQ" right={<Segmented options={METRICS} value={nqMetric} onChange={setNqMetric} />}>
            {(nqMetric === 'vanna' || nqMetric === 'charm') && <FlowStats core={n} />}
            {nqMetric === 'dex' && n.level.dex_total_b != null && (
              <StatRow label="DEX total" value={`${signed(n.level.dex_total_b)}B`} valueClass={n.level.dex_total_b >= 0 ? 'text-term-green' : 'text-term-red'} />
            )}
            <GexDepthChart
              rows={strikesFor(n, nqMetric)}
              priceVal={n.level.price_qqq ?? null}
              fmtStrike={fmtQqq}
              label={METRIC_INFO[nqMetric].label}
              positiveHint={METRIC_INFO[nqMetric].pos}
              negativeHint={METRIC_INFO[nqMetric].neg}
            />
            <p className="mt-1 text-[10px] text-term-muted">{METRIC_INFO[nqMetric].help}</p>
          </Panel>
        )}
        {b && (
          <Panel title="BTC · Exposição por strike" src="Deribit" right={<Segmented options={METRICS} value={btcMetric} onChange={setBtcMetric} />}>
            {(btcMetric === 'vanna' || btcMetric === 'charm') && <FlowStats core={b} />}
            {btcMetric === 'dex' && b.level.dex_total_b != null && (
              <StatRow label="DEX total" value={`${signed(b.level.dex_total_b)}B`} valueClass={b.level.dex_total_b >= 0 ? 'text-term-green' : 'text-term-red'} />
            )}
            <GexDepthChart
              rows={strikesFor(b, btcMetric)}
              priceVal={b.level.price}
              fmtStrike={fmtBtc}
              label={METRIC_INFO[btcMetric].label}
              positiveHint={METRIC_INFO[btcMetric].pos}
              negativeHint={METRIC_INFO[btcMetric].neg}
            />
            <p className="mt-1 text-[10px] text-term-muted">{METRIC_INFO[btcMetric].help}</p>
          </Panel>
        )}
      </PanelGrid>

      {n && (
        <PanelGrid cols={3}>
          <Panel title="NQ · 0DTE" src={n.zero_dte ? `expira ${n.zero_dte.expiry.slice(8)}/${n.zero_dte.expiry.slice(5, 7)}` : undefined}>
            {n.zero_dte ? (
              <>
                <StatRow label="Gamma Wall 0DTE" value={n.zero_dte.gamma_wall_qqq != null ? fmtQqq(n.zero_dte.gamma_wall_qqq) : '—'} />
                <StatRow label="Call Resistance" value={n.zero_dte.call_resistance_qqq != null ? fmtQqq(n.zero_dte.call_resistance_qqq) : '—'} />
                <StatRow label="Put Support" value={n.zero_dte.put_support_qqq != null ? fmtQqq(n.zero_dte.put_support_qqq) : '—'} />
                <StatRow label="Volume calls / puts" value={`${fmtCompact(n.zero_dte.volume_calls)} / ${fmtCompact(n.zero_dte.volume_puts)}`} />
                <div className="mt-2">
                  <GexDepthChart rows={n.zero_dte.strikes} priceVal={n.level.price_qqq ?? null} fmtStrike={fmtQqq} label="GEX 0DTE" />
                </div>
              </>
            ) : (
              <div className="text-[11px] text-term-muted py-3">Sem expiração nas próximas 24h (mercado fechado).</div>
            )}
          </Panel>
          <Panel title="NQ · Expected Move" src="1 desvio-padrão implícito nas opções">
            <ExpectedMove moves={n.expected_moves} spot={n.level.price_qqq ?? 0} toDisplay={toNq} fmtMove={(v) => `${v} ${ratio ? 'pts' : 'QQQ'}`} />
          </Panel>
          <Panel title="NQ · Volume de opções por strike" src="QQQ · todas as expirações">
            <VolumeByStrike rows={n.volume_strikes} spot={n.level.price_qqq ?? 0} fmtStrike={fmtQqq} />
            <StatRow label="Prémio negociado hoje · calls / puts" value={`$${fmtCompact(n.premium_traded.calls)} / $${fmtCompact(n.premium_traded.puts)}`} />
            <p className="mt-1 text-[10px] text-term-muted">Volume não distingue compra de venda: mostra onde está a atividade, não a direção.</p>
          </Panel>
        </PanelGrid>
      )}

      <PanelGrid cols={2}>
        <Panel title="BTC · Livro de ordens" src={`Kraken spot · ${kraken.status === 'live' ? 'ao vivo' : kraken.status === 'down' ? 'sem ligação' : 'a ligar'}`}>
          <OrderBookDepth bids={kraken.bids} asks={kraken.asks} />
        </Panel>
        <Panel title="BTC · Fluxo de trades (CVD)" src="Kraken spot · compras − vendas a mercado, acumulado">
          <TradeFlow trades={kraken.trades} />
        </Panel>
      </PanelGrid>
      <p className="text-[10px] text-term-muted mb-2">
        Livro e fluxo são só da Kraken (spot), uma fatia do mercado de BTC — servem para ler pressão de curto prazo, não o mercado todo.
      </p>

      <PanelGrid cols={2}>
        {vix.data && (
          <Panel title="VIX · Volatilidade" src="1 ano · referências em 20 e 30">
            <VixChart data={vixSeries} height={170} />
          </Panel>
        )}
        {b && b.expected_moves.length > 0 && (
          <Panel title="BTC · Expected Move" src="1 desvio-padrão implícito nas opções Deribit">
            <ExpectedMove moves={b.expected_moves} spot={b.level.price} toDisplay={(v) => v} fmtMove={(v) => `$${v}`} />
          </Panel>
        )}
      </PanelGrid>

      <p className="text-[11px] text-term-muted mt-2">
        Níveis de contexto apenas — nunca um sinal de entrada. GEX, vanna e charm assumem a convenção pública de posicionamento dos dealers (long calls / short puts); é uma
        aproximação a partir do open interest, não fluxo observado.
      </p>
    </>
  )
}
