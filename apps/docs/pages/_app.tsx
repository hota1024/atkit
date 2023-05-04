import { AppProps } from 'next/app'
import { CoreAtkitBskyProvider } from '../contexts/CoreAtkitBskyContext'
import { useState } from 'react'
import { NextUIProvider } from '@nextui-org/react'
import { AtkitBsky } from '@atkit/core'

export default function App(props: AppProps) {
  const { Component } = props

  const [atkit, setAtkit] = useState<AtkitBsky>()

  return (
    <>
      <CoreAtkitBskyProvider value={{ atkit, setAtkit }}>
        <Component />
      </CoreAtkitBskyProvider>
    </>
  )
}
