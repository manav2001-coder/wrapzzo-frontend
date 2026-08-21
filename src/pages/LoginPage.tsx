import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, type TokenResponse } from '../api/auth'

export function LoginPage({ onLogin }: { onLogin: (tokens: TokenResponse, email: string) => void }) {
  const [email, setEmail] = useState('superadmin@wrapzzo.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const tokens = await login(email, password)
      onLogin(tokens, email)
      navigate('/companies')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={handleLogin}>
        <h1>Wrapzzo API Test</h1>
        <p className="app-subtitle">Minimal harness to verify the backend. Not the real UI.</p>
        <label className="field">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit">
          Log in
        </button>
        {error && <p className="error">Error: {error}</p>}
      </form>
    </div>
  )
}
