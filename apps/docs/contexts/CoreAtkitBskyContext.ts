import { createContext, useContext } from 'react'
import { AtkitBsky } from '@atkit/core'

const CoreAtkitBskyContext = createContext<{
  atkit: AtkitBsky | null
  setAtkit: (atkit: AtkitBsky) => void
}>({
  atkit: null,
  setAtkit() {},
})

export const useCoreAtkitBsky = () => {
  return useContext(CoreAtkitBskyContext)
}

export const CoreAtkitBskyProvider = CoreAtkitBskyContext.Provider
