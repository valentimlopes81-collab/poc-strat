// Shapes returned by the /api functions (and by the snapshots the data
// refresh job saves from them, used as fallback).

import type { IvSkewData, IvSurfaceData, IvTermData, LevelRow } from './types'

export interface StrikeValue {
  strike: number
  gex: number
}

export interface ExpectedMove {
  expiry: string
  dte: number
  atm_iv: number | null
  straddle: number | null
  sigma_move: number | null
  upper: number | null
  lower: number | null
}

export interface Flows {
  vanna_per_volpt_b: number | null
  charm_per_day_b: number | null
}

/** the numeric half of a level row; the written plan is merged in on the client */
export type LiveLevel = Omit<LevelRow, 'bias' | 'note' | 'scenarios' | 'confirmation'>

interface CoreBase {
  level: LiveLevel
  gex_strikes: StrikeValue[]
  dex_strikes: StrikeValue[]
  vanna_strikes: StrikeValue[]
  charm_strikes: StrikeValue[]
  flows: Flows
  /** [hypothetical spot, total GEX in $B] */
  profile: Array<[number, number]>
  expected_moves: ExpectedMove[]
  max_pain_expiry: string | null
  pcr_oi: number | null
}

export interface ZeroDte {
  expiry: string
  gex_total_b: number
  gamma_wall_qqq: number | null
  gamma_wall: number | null
  gamma_wall_gex: number | null
  call_resistance_qqq: number | null
  put_support_qqq: number | null
  volume_calls: number
  volume_puts: number
  strikes: StrikeValue[]
}

export interface NqCore extends CoreBase {
  meta: {
    ratio: number | null
    spot_qqq_delayed: number
    spot_basis: 'futuros' | 'cboe_delayed'
    quote_time_utc: string | null
    contracts: number
    prev_close_qqq: number | null
    iv30: number | null
    iv30_change: number | null
  }
  zero_gammas_qqq: number[]
  zero_dte: ZeroDte | null
  max_pain_qqq: number | null
  pcr_volume: number | null
  volume_total: { calls: number; puts: number }
  premium_traded: { calls: number; puts: number }
  volume_strikes: Array<{ strike: number; calls: number; puts: number }>
}

export interface BtcCore extends CoreBase {
  meta: {
    contracts: number
    dvol: number | null
    funding_8h_pct: number | null
    perp_oi_usd: number | null
    perp_mark: number | null
  }
  zero_gammas: number[]
  max_pain: number | null
  first_expiry_iv: number | null
}

export interface HeatmapData {
  spot: number
  expiries: string[]
  rows: Array<{ expiry: string; strike: number; gex: number }>
}

export interface VolView {
  as_of_utc: string
  heatmap: HeatmapData
  iv_term: IvTermData
  iv_skew: IvSkewData & { expiry: string | null }
  iv_surface?: IvSurfaceData
}

export interface ApiCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  calls_volume?: number
  puts_volume?: number
}

export interface CandlesResp {
  symbol: string
  tf: string
  candles: ApiCandle[]
  last?: number | null
  last_time?: number | null
  prev_close?: number | null
}

export type Timeframe = '5m' | '15m' | '1h' | '1d'
