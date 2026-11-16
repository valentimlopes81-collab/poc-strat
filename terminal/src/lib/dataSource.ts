// Static data files (snapshots, history, the written plan) live in the repo
// and are committed by the refresh job and the briefing routines. Reading
// them straight from GitHub means a data commit shows up within minutes
// without needing a new deploy; the copy bundled with the site is the fallback.

const RAW_BASE = 'https://raw.githubusercontent.com/valentimlopes81-collab/poc-strat/claude/crypto-poc-indicator-vic87s/terminal/public'

const isLocal = typeof location !== 'undefined' && /^(localhost|127\.|\[::1\])/.test(location.host)

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

/** `path` is site-relative, e.g. "/data/levels.json". */
export async function fetchData<T>(path: string): Promise<T> {
  // local dev serves the working tree, which may be ahead of what is pushed
  if (!isLocal) {
    try {
      return await getJson<T>(RAW_BASE + path)
    } catch {
      // GitHub unreachable or the file is not pushed yet: use the bundled copy
    }
  }
  return getJson<T>(path)
}
