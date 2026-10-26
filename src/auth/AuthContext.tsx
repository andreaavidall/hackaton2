import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setOnUnauthorized, setToken } from '../api/client'
import type { LoginResponse, MeResponse, Team, User } from '../api/types'

// 'checking' = todavia estamos preguntando a /auth/me si el token guardado sirve.
// Es un estado propio justamente para NO mostrar el login mientras verificamos.
type Status = 'checking' | 'authenticated' | 'anonymous'

type AuthValue = {
  status: Status
  user: User | null
  team: Team | null
  login: (email: string, password: string) => Promise<void>
  register: (teamName: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking')
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeam] = useState<Team | null>(null)

  const clearSession = useCallback(() => {
    setToken(null)
    setUser(null)
    setTeam(null)
    setStatus('anonymous')
  }, [])

  // Al recargar la pagina el estado de React se pierde, pero el token sigue en
  // localStorage. Preguntamos a /auth/me si todavia vale: si vale, restauramos
  // la sesion; si no, la limpiamos.
  useEffect(() => {
    if (getToken() === null) {
      setStatus('anonymous')
      return
    }

    let cancelled = false

    api<MeResponse>('/auth/me')
      .then((me) => {
        if (cancelled) return
        setUser(me.user)
        setTeam(me.team)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        clearSession()
      })

    return () => {
      cancelled = true
    }
  }, [clearSession])

  // Si en cualquier momento la API responde 401, la sesion dejo de ser valida
  // y la app vuelve al login sola.
  useEffect(() => {
    setOnUnauthorized(clearSession)
    return () => setOnUnauthorized(null)
  }, [clearSession])

  const applySession = useCallback((data: LoginResponse) => {
    setToken(data.token)
    setUser(data.user)
    setTeam(data.team)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      applySession(data)
    },
    [applySession],
  )

  // El registro ya devuelve token, asi que el equipo entra directo a la app.
  const register = useCallback(
    async (teamName: string, email: string, password: string) => {
      const data = await api<LoginResponse>('/auth/register', {
        method: 'POST',
        body: { teamName, email, password },
      })
      applySession(data)
    },
    [applySession],
  )

  const value = useMemo<AuthValue>(
    () => ({ status, user, team, login, register, logout: clearSession }),
    [status, user, team, login, register, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (value === null) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return value
}
