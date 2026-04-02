import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, isAuthed } = useAuth()
  const navigate = useNavigate()

  if (isAuthed) {
    navigate('/tagger', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    setLoading(true)
    const ok = await login(password)
    setLoading(false)
    if (ok) {
      navigate('/tagger')
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-dvh px-4" style={{ background: 'var(--color-surface-base)', color: '#27272A' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <h1 className="font-display text-2xl font-bold text-center" style={{ color: '#27272A' }}>Wildcats Clip Tagger</h1>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-3 rounded-lg border text-base"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: error ? 'var(--color-error)' : 'var(--color-surface-border)',
            color: '#27272A',
          }}
        />
        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>Wrong password</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 rounded-lg font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-amber-600)' }}
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
