import React, { useEffect } from 'react'
import { useCoreAtkitBsky } from '../contexts/CoreAtkitBskyContext'
import { AtkitBsky } from '@atkit/core'
import { LoginForm, LoginFormProps } from './LoginForm'

export interface ExampleContainerProps {
  children?: React.ReactNode
  loginRequired?: boolean
}

export function ExampleContainer(props: ExampleContainerProps) {
  const { children, loginRequired } = props
  const { atkit, setAtkit } = useCoreAtkitBsky()

  const handleSubmit: LoginFormProps['onSubmit'] = ({
    serviceURL,
    identifier,
    password,
  }) => {
    const atkit = new AtkitBsky({
      service: serviceURL,
    })

    setAtkit(atkit)

    atkit.login({ identifier, password })
  }

  if (!atkit) {
    setAtkit(
      new AtkitBsky({
        service: 'https://bsky.social',
      })
    )
  }

  if (!atkit || (atkit.authState === 'logged-out' && loginRequired)) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexFlow: 'column',
          border: '1px solid rgba(128, 128, 128, 0.3)',
          borderRadius: '8px',
          padding: '2rem 0',
        }}
      >
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          Login to use this example
        </p>
        <LoginForm onSubmit={handleSubmit} />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexFlow: 'column',
        border: '1px solid rgba(128, 128, 128, 0.3)',
        borderRadius: '8px',
        padding: '2rem 1rem',
      }}
    >
      {children}
    </div>
  )
}
