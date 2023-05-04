import React from 'react'

export interface ExampleContainerProps {
  children?: React.ReactNode
  loginRequired?: boolean
}

export function ExampleContainer(props: ExampleContainerProps) {
  const { children } = props
}
