// Black-Scholes greeks. Mirrors backtest/quant/gex_common.py (same floor on T,
// same r) so the live API and the Python export agree on the same inputs.

export const RATE = 0.04
// 2h floor: BS gamma diverges as T->0, which would let a single near-expiry
// strike dominate every total in the last minutes of the session.
export const MIN_T_YEARS = 2 / 24 / 365

const SQRT_2PI = Math.sqrt(2 * Math.PI)

export function normPdf(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI
}

// Abramowitz-Stegun 7.1.26, |error| < 1.5e-7
export function normCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2)
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const erf = 1 - poly * Math.exp(-(x * x) / 2)
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf)
}

function d1d2(S, K, T, sigma, r) {
  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  return [d1, d1 - sigma * sqrtT, sqrtT]
}

function valid(S, K, T, sigma) {
  return T > 0 && sigma > 0 && S > 0 && K > 0
}

export function gamma(S, K, T, sigma, r = RATE) {
  T = Math.max(T, MIN_T_YEARS)
  if (!valid(S, K, T, sigma)) return 0
  const [d1, , sqrtT] = d1d2(S, K, T, sigma, r)
  return normPdf(d1) / (S * sigma * sqrtT)
}

export function delta(S, K, T, sigma, cp, r = RATE) {
  T = Math.max(T, MIN_T_YEARS)
  if (!valid(S, K, T, sigma)) return 0
  const [d1] = d1d2(S, K, T, sigma, r)
  const nd1 = normCdf(d1)
  return cp === 'C' ? nd1 : nd1 - 1
}

// dDelta/dSigma, per 1.00 of vol. Identical for calls and puts.
export function vanna(S, K, T, sigma, r = RATE) {
  T = Math.max(T, MIN_T_YEARS)
  if (!valid(S, K, T, sigma)) return 0
  const [d1, d2] = d1d2(S, K, T, sigma, r)
  return (-normPdf(d1) * d2) / sigma
}

// dDelta/dt per YEAR of calendar time passing (no dividends, so identical
// for calls and puts). Divide by 365 for the per-day figure.
export function charm(S, K, T, sigma, r = RATE) {
  T = Math.max(T, MIN_T_YEARS)
  if (!valid(S, K, T, sigma)) return 0
  const [d1, d2, sqrtT] = d1d2(S, K, T, sigma, r)
  return (-normPdf(d1) * (2 * r * T - d2 * sigma * sqrtT)) / (2 * T * sigma * sqrtT)
}

export function price(S, K, T, sigma, cp, r = RATE) {
  if (!valid(S, K, T, sigma)) return Math.max(0, cp === 'C' ? S - K : K - S)
  const [d1, d2] = d1d2(S, K, T, sigma, r)
  const disc = K * Math.exp(-r * T)
  return cp === 'C' ? S * normCdf(d1) - disc * normCdf(d2) : disc * normCdf(-d2) - S * normCdf(-d1)
}
