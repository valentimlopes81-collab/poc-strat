import { useCallback, useState } from 'react'

const PREFIX = 'nqbtc:'

// useState that survives a reload. Storage can be unavailable (private mode,
// blocked site data), so every access is guarded and the UI works without it.
export function usePersistentState<T extends string | number | boolean>(key: string, initial: T, isValid?: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw == null) return initial
      const parsed: unknown = JSON.parse(raw)
      if (isValid ? isValid(parsed) : typeof parsed === typeof initial) return parsed as T
    } catch {
      // fall through to the default
    }
    return initial
  })

  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next))
      } catch {
        // not persisted this time; state still updates
      }
    },
    [key],
  )

  return [value, set] as const
}

export const oneOf =
  <T extends string>(...options: T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (options as string[]).includes(v)
