import { FormEvent, useState } from 'react'

const ACCESS_PASSWORD = 'WeisLineage2026!'
const SESSION_KEY = 'lineage-explorer-access'

export function hasSessionAccess() {
  return sessionStorage.getItem(SESSION_KEY) === 'granted'
}

export default function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== ACCESS_PASSWORD) {
      setError('La contraseña no es correcta. Inténtalo de nuevo.')
      return
    }

    sessionStorage.setItem(SESSION_KEY, 'granted')
    onUnlock()
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-labelledby="access-title">
        <span className="eyebrow">Proprietary and confidential</span>
        <h1 id="access-title">Data Lineage Explorer</h1>
        <p>Ingresa la contraseña para consultar el linaje documentado.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="access-password">Contraseña</label>
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
              {showPassword ? 'Ocultar' : 'Revelar'}
            </button>
          </div>
          {error ? <p className="access-error" id="access-error" role="alert">{error}</p> : null}
          <button className="access-submit" type="submit">Acceder</button>
        </form>
      </section>
    </main>
  )
}
