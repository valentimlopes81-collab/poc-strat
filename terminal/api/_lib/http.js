const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

export async function getJson(url, { timeoutMs = 12000, headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`${new URL(url).hostname} respondeu ${res.status}`)
  return res.json()
}

// Resolves to null instead of throwing, for inputs the response can do without.
export async function optional(promise) {
  try {
    return await promise
  } catch {
    return null
  }
}

// CDN caches for sMaxAge and keeps serving the stale copy while it refetches,
// so upstream is hit at most about once per sMaxAge however many tabs are open.
export function sendJson(res, body, { sMaxAge = 60, swr = 300 } = {}) {
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`)
  res.statusCode = 200
  res.end(JSON.stringify(body))
}

export function sendError(res, err, status = 502) {
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.statusCode = status
  res.end(JSON.stringify({ error: String(err?.message ?? err) }))
}

export const round = (v, dp = 2) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** dp) / 10 ** dp)
