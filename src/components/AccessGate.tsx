import { FormEvent, useState } from 'react'

/**
 * A shared prompt for a discovery prototype, not a security control: an SPA
 * ships whatever it checks against. Anything that must actually be restricted
 * belongs behind deployment-level protection.
 */
const ACCESS_PASSWORD = 'WeisLineage2026!'

export default function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== ACCESS_PASSWORD) {
      setError('The password is incorrect. Please try again.')
      return
    }

    onUnlock()
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-labelledby="access-title">
        <span className="eyebrow">Proprietary and confidential</span>
        <h1 id="access-title">Data Lineage Explorer</h1>
        <p>Enter the password to view the documented lineage.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="access-password">Password</label>
          <div className="password-field">
            <input
              id="access-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError('')
              }}
              autoComplete="current-password"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'access-error' : undefined}
            />
            <button
              type="button"
              className="reveal-password"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Reveal'}
            </button>
          </div>
          {error ? <p className="access-error" id="access-error" role="alert">{error}</p> : null}
          <button className="access-submit" type="submit">Sign in</button>
        </form>
      </section>
    </main>
  )
}
