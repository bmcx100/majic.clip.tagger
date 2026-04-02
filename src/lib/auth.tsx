import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthContextType {
  isAuthed: boolean
  login: (password: string) => Promise<boolean>
  logout: () => void
  password: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(() =>
    localStorage.getItem('hct-password')
  )

  const isAuthed = password !== null

  async function login(pw: string): Promise<boolean> {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      localStorage.setItem('hct-password', pw)
      setPassword(pw)
      return true
    }
    return false
  }

  function logout() {
    localStorage.removeItem('hct-password')
    setPassword(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthed, login, logout, password }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
