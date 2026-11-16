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

// Cumulative normal, double precision (G. West, "Better approximations to
// cumulative normal functions", 2005). A cheaper approximation is not enough
// here: its 1e-7 error shows up when prices are differenced to check greeks.
export function normCdf(x) {
  const ax = Math.abs(x)
  let c = 0
  if (ax <= 37) {
    const e = Math.exp((-ax * ax) / 2)
    if (ax < 7.07106781186547) {
      let b = 3.52624965998911e-2 * ax + 0.700383064443688
      b = b * ax + 6.37396220353165
      b = b * ax + 33.912866078383
      b = b * ax + 112.079291497871
      b = b * ax + 221.213596169931
      b = b * ax + 220.206867912376
      c = e * b
      b = 8.83883476483184e-2 * ax + 1.75566716318264
      b = b * ax + 16.064177579207
      b = b * ax + 86.7807322029461
      b = b * ax + 296.564248779674
      b = b * ax + 637.333633378831
      b = b * ax + 793.826512519948
      b = b * ax + 440.413735824752
      c /= b
    } else {
      let b = ax + 0.65
      b = ax + 4 / b
      b = ax + 3 / b
      b = ax + 2 / b
      b = ax + 1 / b
      c = e / b / 2.506628274631
    }
  }
  return x > 0 ? 1 - c : c
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
