import { FormEvent, useState } from 'react'

export interface LoginFormProps {
  onSubmit(params: {
    serviceURL: string
    identifier: string
    password: string
  }): Promise<void> | void
}

export function LoginForm(props: LoginFormProps) {
  const { onSubmit } = props

  const [serviceURL, setServiceURL] = useState<string>('https://bsky.social')
  const [identifier, setIdentifier] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await onSubmit({
        serviceURL,
        identifier,
        password,
      })
    } catch (err) {
      console.error(err)
      setError(err.toString())
    }
  }

  return (
    <div style={{ maxWidth: 400, width: '100%' }}>
      <form onSubmit={handleSubmit}>
        <div className="nx-mb-4">
          <label
            className="nx-block nx-text-lg nx-font-bold nx-mb-2"
            htmlFor="service-url"
          >
            Service
          </label>
          <input
            placeholder="Service URL"
            className="nx-w-full nx-border nx-appearance-none nx-rounded nx-py-2 nx-px-3"
            name="service-url"
            id="service-url"
            value={serviceURL}
            onChange={(e) => setServiceURL(e.target.value)}
          />
        </div>
        <div className="nx-mb-4">
          <label
            className="nx-block nx-text-lg nx-font-bold nx-mb-2"
            htmlFor="identifier"
          >
            Identifier
          </label>
          <input
            placeholder="{handle}.bsky.social"
            className="nx-w-full nx-border nx-appearance-none nx-rounded nx-py-2 nx-px-3"
            name="identifier"
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div className="nx-mb-4">
          <label
            className="nx-block nx-text-lg nx-font-bold nx-mb-2"
            htmlFor="password"
          >
            Password
          </label>
          <input
            placeholder="Password"
            className="nx-w-full nx-border nx-appearance-none nx-rounded nx-py-2 nx-px-3"
            name="password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="nx-mb-4" style={{ color: 'red' }}>
          {error}
        </div>
        <div className="nx-flex nx-items-center nx-justify-between">
          <button
            className="nx-bg-white nx-border nx-appearance-none nx-rounded nx-py-2 nx-px-3"
            style={{ color: '#202020' }}
          >
            Sign In
          </button>
          <a
            className="nx-inline-block nx-align-baseline nx-font-bold nx-text-sm"
            href="https://staging.bsky.app/settings/app-passwords"
            target="_blank"
          >
            We reccomend using App Password
          </a>
        </div>
      </form>
    </div>
  )
}
