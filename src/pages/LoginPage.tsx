import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { readReturnTo } from '../auth/RequireAuth'
import { Card, Field, buttonClass, inputClass } from '../components/ui'

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [sending, setSending] = useState(false)

  // A donde queria entrar el usuario antes de que lo mandaramos al login.
  const returnTo = readReturnTo(location.state)

  // Si ya hay sesion, esta pantalla no tiene nada que hacer.
  if (status === 'authenticated') return <Navigate to={returnTo} replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await login(email, password)
      // replace: el login no deberia quedar en el historial.
      navigate(returnTo, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', errorMessage(caught)))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-amber-400">Iniciar sesion</h1>
        <p className="mt-1 text-sm text-slate-400">Entra con la cuenta de la tripulacion.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Email" error={error?.fieldMessage('email')}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="sabuesos@grandline.test"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Contrasena" error={error?.fieldMessage('password')}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </Field>

          {/* Errores que no son de un campo concreto, como credenciales invalidas. */}
          {error !== null && error.details.length === 0 && (
            <p className="text-sm text-red-400" role="alert">
              {error.message}
            </p>
          )}

          <button type="submit" disabled={sending} className={`${buttonClass} w-full`}>
            {sending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Primera vez?{' '}
          <Link to="/register" className="text-amber-400 hover:underline">
            Registra tu tripulacion
          </Link>
        </p>
      </Card>
    </div>
  )
}
