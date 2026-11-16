// Small statistics helpers for the cross-asset view. Plain arrays in, plain
// numbers out.

export const logReturns = (closes) => closes.slice(1).map((c, i) => Math.log(c / closes[i]))

export function pearson(a, b) {
  const n = Math.min(a.length, b.length)
  if (n < 3) return null
  let sa = 0
  let sb = 0
  for (let i = 0; i < n; i++) {
    sa += a[i]
    sb += b[i]
  }
  const ma = sa / n
  const mb = sb / n
  let cov = 0
  let va = 0
  let vb = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma
    const db = b[i] - mb
    cov += da * db
    va += da * da
    vb += db * db
  }
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : null
}

const variance = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)
}

const annualize = (dailyVar) => Math.sqrt(dailyVar * 252) * 100

// RiskMetrics EWMA. Returns one annualized vol (%) per return from `seed` on;
// entry i is the variance known after return i.
export function ewmaVol(rets, lambda = 0.94, seed = 20) {
  if (rets.length <= seed) return []
  let v = variance(rets.slice(0, seed))
  const out = [annualize(v)]
  for (let i = seed; i < rets.length; i++) {
    v = lambda * v + (1 - lambda) * rets[i] ** 2
    out.push(annualize(v))
  }
  return out
}

function garchPath(rets, omega, alpha, beta, v0) {
  const vars = new Array(rets.length)
  let v = v0
  let ll = 0
  for (let i = 0; i < rets.length; i++) {
    vars[i] = v
    ll -= 0.5 * (Math.log(v) + (rets[i] * rets[i]) / v)
    v = omega + alpha * rets[i] * rets[i] + beta * v
  }
  return { vars, next: v, ll }
}

// GARCH(1,1) by maximum likelihood with variance targeting (omega is tied to
// the sample variance, leaving alpha and beta), searched on a grid and then
// refined around the best cell. Coarse but deterministic and dependency-free.
export function fitGarch(rawRets) {
  if (rawRets.length < 100) return null
  const mean = rawRets.reduce((a, b) => a + b, 0) / rawRets.length
  const rets = rawRets.map((r) => r - mean)
  const uncond = variance(rets)
  const score = (alpha, beta) => {
    if (alpha <= 0 || beta <= 0 || alpha + beta >= 0.9995) return -Infinity
    return garchPath(rets, uncond * (1 - alpha - beta), alpha, beta, uncond).ll
  }
  let best = { alpha: 0.05, beta: 0.9, ll: -Infinity }
  const search = (aLo, aHi, bLo, bHi, steps) => {
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const alpha = aLo + ((aHi - aLo) * i) / steps
        const beta = bLo + ((bHi - bLo) * j) / steps
        const ll = score(alpha, beta)
        if (ll > best.ll) best = { alpha, beta, ll }
      }
    }
  }
  search(0.01, 0.3, 0.5, 0.985, 30)
  for (const span of [0.02, 0.004]) search(best.alpha - span, best.alpha + span, best.beta - span, best.beta + span, 20)

  const { alpha, beta } = best
  const omega = uncond * (1 - alpha - beta)
  const path = garchPath(rets, omega, alpha, beta, uncond)
  const persistence = alpha + beta
  // E[var at t+k] decays from next-day variance toward the long-run level
  const forecast = (days) => {
    let sum = 0
    for (let k = 1; k <= days; k++) sum += uncond + persistence ** (k - 1) * (path.next - uncond)
    return annualize(sum / days)
  }
  return {
    alpha,
    beta,
    persistence,
    longRunVol: annualize(uncond),
    series: [...path.vars.map(annualize), annualize(path.next)],
    forecast,
  }
}
