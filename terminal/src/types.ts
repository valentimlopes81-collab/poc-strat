export interface LevelRow {
  asset: 'NQ' | 'BTC'
  as_of_utc: string
  price: number
  price_ref: string
  price_qqq?: number
  gex_total_b: number
  gex_regime: string
  call_wall: number
  call_wall_ref: string | null
  call_wall_qqq?: number
  put_wall: number
  put_wall_ref: string | null
  put_wall_qqq?: number
  zero_gamma: number
  zero_gamma_ref: string | null
  zero_gamma_qqq?: number
  dte0_dominant: number | null
  dte0_dominant_ref: string | null
  vix: number | null
  vix_change_pct: number | null
  vix_reading: string | null
  bias: string
  note: string
}

export interface GexStrikeRow {
  asset: 'NQ' | 'BTC'
  strike: number
  gex: number
}

export interface CotRow {
  report_week: string
  report_date: string
  open_interest_all: number
  lf_long: number
  lf_short: number
  lf_net: number
  lf_net_pct_oi: number
  lf_net_prev: number
  am_long: number
  am_short: number
  am_net: number
  reading: string
}

export interface FomcRow {
  date: string
  doc_type: string
  label: string
  url: string
}

export interface ScorecardRow {
  date: string
  asset: string
  bias: string
  confidence: string
  verdict: 'Confirmado' | 'Parcial' | 'Falhou' | 'Resumo'
}

export interface AccountRow {
  metric: string
  value: number
  label: string
}

export interface TradeRow {
  id: string
  date: string
  direction: string
  result: 'Win' | 'Loss' | 'BE'
  r_multiple: string
  pnl_usd: number
  pnl_approx: boolean
  setup: string
  notes_short: string
}

export interface AlertRow {
  time: string
  asset: string
  severity: 'info' | 'notable' | 'critical' | 'system'
  title: string
  detail: string
}

export interface EconEvent {
  title: string
  country: string
  date: string
  impact: string
  forecast: string
  previous: string
}
