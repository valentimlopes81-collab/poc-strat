import { useEffect, useRef, useState } from 'react'

/** Tracks an element's content width, for SVG charts that draw in real pixels. */
export function useWidth<T extends HTMLElement>(initial = 300) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}
