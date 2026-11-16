import { useEffect, useState } from 'react'

/**
 * Tracks an element's content width, for SVG charts that draw in real pixels.
 * Uses a callback ref so it also works when the element only mounts later
 * (e.g. after a loading placeholder).
 */
export function useWidth<T extends HTMLElement>(initial = 300) {
  const [node, setNode] = useState<T | null>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [node])
  return [setNode, width] as const
}
