import type { BtcCore, NqCore } from '../api'
import { useKraken } from '../lib/kraken'
import { fmtInt, signed } from '../lib/levels'
import type { CotRow } from '../types'

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span>
      <span className="text-term-muted mr-1.5">{label}</span>
      {children}
    </span>
  )
}

const tone = (v: number) => (v >= 0 ? 'text-term-green' : 'text-term-red')

export function TickerTape({ nq, btc, cot }: { nq: NqCore | null; btc: BtcCore | null; cot: CotRow[] | null }) {
  const cotRow = cot?.[0] ?? null
  const qqq = nq?.level.price_qqq
  const prev = nq?.meta.prev_close_qqq
  const dayPct = qqq && prev ? (qqq / prev - 1) * 100 : null
  const { ticker } = useKraken()

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] tabular-nums py-1">
      {nq && (
        <Item label="NQ">
          <span className="font-semibold">{fmtInt(nq.level.price)}</span>
          {dayPct != null && <span className={`ml-1.5 ${tone(dayPct)}`}>{signed(dayPct)}%</span>}
          <span className={`ml-1.5 ${tone(nq.level.gex_total_b)}`}>GEX {signed(nq.level.gex_total_b)}B</span>
        </Item>
      )}
      {btc && (
        <Item label="BTC">
          <span className="font-semibold">${fmtInt(ticker?.last ?? btc.level.price)}</span>
          {ticker && <span className={`ml-1.5 ${tone(ticker.changePct)}`}>{signed(ticker.changePct)}%</span>}
          <span className={`ml-1.5 ${tone(btc.level.gex_total_b)}`}>GEX {signed(btc.level.gex_total_b, 3)}B</span>
        </Item>
      )}
      {nq?.level.vix != null && (
        <Item label="VIX">
          <span className="font-semibold">{nq.level.vix.toFixed(2)}</span>
          {nq.level.vix_change_pct != null && <span className={`ml-1.5 ${nq.level.vix_change_pct >= 0 ? 'text-term-red' : 'text-term-green'}`}>{signed(nq.level.vix_change_pct, 1)}%</span>}
        </Item>
      )}
      {btc?.meta.dvol != null && (
        <Item label="DVOL">
          <span className="font-semibold">{btc.meta.dvol.toFixed(1)}</span>
        </Item>
      )}
      {cotRow && (
        <Item label="COT NQ">
          <span className={tone(cotRow.lf_net)}>
            {cotRow.lf_net >= 0 ? '+' : ''}
            {cotRow.lf_net.toLocaleString('en-US')}
          </span>
        </Item>
      )}
    </div>
  )
}
