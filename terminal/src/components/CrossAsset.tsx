import { useMemo, useState } from 'react'
import type { CrossData } from '../api'
import { signed } from '../lib/levels'
import { LineChart, SERIES_COLORS } from './LineChart'
import { Segmented } from './Panel'

const pctTone = (v: number | null) => (v == null ? 'text-term-muted' : v >= 0 ? 'text-term-green' : 'text-term-red')
const pct = (v: number | null) => (v == null ? '—' : `${signed(v)}%`)

export function AssetPerformance({ data }: { data: CrossData }) {
  return (
    <table className="w-full text-[11px] tabular-nums">
      <thead>
        <tr className="text-term-muted text-[10px] uppercase tracking-wide">
          <th className="text-left font-normal py-1">Ativo</th>
          <th className="text-right font-normal">Último</th>
          <th className="text-right font-normal">1d</th>
          <th className="text-right font-normal">5d</th>
          <th className="text-right font-normal">20d</th>
        </tr>
      </thead>
      <tbody>
        {data.assets.map((a) => (
          <tr key={a.key} className="border-t border-term-border">
            <td className="py-1 text-term-amber font-semibold">{a.label}</td>
            <td className="text-right">{a.last?.toLocaleString('en-US')}</td>
            <td className={`text-right ${pctTone(a.chg_1d)}`}>{pct(a.chg_1d)}</td>
            <td className={`text-right ${pctTone(a.chg_5d)}`}>{pct(a.chg_5d)}</td>
            <td className={`text-right ${pctTone(a.chg_20d)}`}>{pct(a.chg_20d)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// two opposite hues meeting at a neutral: strength of colour = strength of correlation
function corrColor(v: number | null): string {
  if (v == null) return 'transparent'
  const a = Math.min(1, Math.abs(v)) * 0.6
  return v >= 0 ? `rgba(57,135,229,${a.toFixed(2)})` : `rgba(217,89,38,${a.toFixed(2)})`
}

export function CorrMatrix({ data }: { data: CrossData }) {
  const [win, setWin] = useState<'20' | '60'>('20')
  const m = win === '20' ? data.corr_20d : data.corr_60d
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-term-muted">correlação dos retornos diários</span>
        <Segmented
          options={[
            { value: '20', label: '20 dias' },
            { value: '60', label: '60 dias' },
          ]}
          value={win}
          onChange={setWin}
        />
      </div>
      <table className="w-full text-[11px] tabular-nums border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th />
            {data.labels.map((l) => (
              <th key={l} className="font-normal text-term-muted text-[10px] pb-1">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.map((row, i) => (
            <tr key={data.labels[i]}>
              <td className="text-term-amber font-semibold pr-2 whitespace-nowrap">{data.labels[i]}</td>
              {row.map((v, j) => (
                <td key={j} className="text-center py-1.5" style={{ background: i === j ? '#141414' : corrColor(v) }}>
                  {i === j ? '' : v == null ? '—' : signed(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 text-[10px] text-term-muted mt-1.5">
        <span>
          <span className="inline-block w-2 h-2 mr-1" style={{ background: 'rgba(57,135,229,0.6)' }} />
          movem-se juntos (+1)
        </span>
        <span>
          <span className="inline-block w-2 h-2 mr-1" style={{ background: 'rgba(217,89,38,0.6)' }} />
          movem-se ao contrário (−1)
        </span>
      </div>
    </div>
  )
}

const ROLLING: Array<{ key: string; label: string }> = [
  { key: 'btc', label: 'BTC' },
  { key: 'dxy', label: 'DXY' },
  { key: 'vix', label: 'VIX' },
  { key: 'us10y', label: 'US10Y' },
]
const ZERO = [{ value: 0, label: 'sem relação' }]
const fmtCorr = (v: number) => signed(v)

export function RollingCorrelation({ data }: { data: CrossData }) {
  const series = useMemo(
    () => ROLLING.filter((r) => data.rolling[r.key]?.length).map((r, i) => ({ label: `NQ × ${r.label}`, color: SERIES_COLORS[i], data: data.rolling[r.key] })),
    [data],
  )
  return (
    <div>
      <LineChart series={series} refLines={ZERO} format={fmtCorr} height={200} />
      <p className="mt-1 text-[10px] text-term-muted">
        Correlação em janela móvel de {data.roll_window} dias entre os retornos do NQ e de cada ativo. Mudanças de sinal mostram quando uma relação habitual deixa de valer.
      </p>
    </div>
  )
}

const fmtVol = (v: number) => `${v.toFixed(1)}%`

export function VolModels({ data }: { data: CrossData }) {
  const vol = data.vol
  const series = useMemo(
    () =>
      vol
        ? [
            { label: 'Realizada EWMA', color: SERIES_COLORS[0], data: vol.ewma },
            { label: 'GARCH(1,1)', color: SERIES_COLORS[1], data: vol.garch },
          ].filter((s) => s.data.length)
        : [],
    [vol],
  )
  const refs = useMemo(() => (vol?.implied_30d != null ? [{ value: vol.implied_30d, label: 'Implícita 30d', color: '#e5e5e5' }] : []), [vol])
  if (!vol) return <div className="text-[11px] text-term-muted py-3">Sem dados.</div>
  const implied = vol.implied_30d

  return (
    <div>
      <LineChart series={series} refLines={refs} format={fmtVol} height={180} />
      {vol.garch_forecast.length > 0 && (
        <table className="w-full text-[11px] tabular-nums mt-2">
          <thead>
            <tr className="text-term-muted text-[10px] uppercase tracking-wide">
              <th className="text-left font-normal py-1">Previsão GARCH</th>
              {vol.garch_forecast.map((f) => (
                <th key={f.days} className="text-right font-normal">
                  {f.days}d
                </th>
              ))}
              <th className="text-right font-normal">longo prazo</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-term-border">
              <td className="py-1 text-term-muted">vol anualizada</td>
              {vol.garch_forecast.map((f) => (
                <td key={f.days} className="text-right font-semibold">
                  {fmtVol(f.vol)}
                </td>
              ))}
              <td className="text-right text-term-muted">{vol.garch_params ? fmtVol(vol.garch_params.long_run_vol) : '—'}</td>
            </tr>
          </tbody>
        </table>
      )}
      <p className="mt-1.5 text-[10px] text-term-muted">
        Vol do NQ a partir dos fechos diários. EWMA mede o que já aconteceu; GARCH projeta o regresso gradual à média
        {vol.garch_params && ` (persistência ${vol.garch_params.persistence.toFixed(2)})`}.
        {implied != null &&
          vol.garch_forecast[3] &&
          ` Implícita 30d ${fmtVol(implied)} vs GARCH 21d ${fmtVol(vol.garch_forecast[3].vol)}: as opções estão a pagar ${implied >= vol.garch_forecast[3].vol ? 'mais' : 'menos'} do que o modelo espera.`}
      </p>
    </div>
  )
}
