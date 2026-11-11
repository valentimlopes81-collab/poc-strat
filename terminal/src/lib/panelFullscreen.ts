import { createContext, useContext } from 'react'

export const PanelFullscreenContext = createContext(false)

export function usePanelFullscreen(): boolean {
  return useContext(PanelFullscreenContext)
}
