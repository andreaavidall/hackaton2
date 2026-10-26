import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { readReturnTo } from '../auth/RequireAuth'
import { Card, Field, buttonClass, inputClass } from '../components/ui'

export function RegisterPage() {
  const { status, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [sending, setSending] = useState(false)

  const returnTo = readReturnTo(location.state)

  if (status === 'authenticated') return <Navigate to={returnTo} replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      // El registro devuelve token, asi que entramos directo con la sesion iniciada.
      await register(teamName, email, password)
      navigate(returnTo, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', errorMessage(caught)))
    } finally {
      setSending(false)
    }
  }

  // La API avisa de los duplicados con un 409 y un code, sin `details`.
  // Los traducimos al campo que le corresponde a cada uno.
  const teamNameError =
    error?.fieldMessage('teamName') ??
    (error?.code === 'TEAM_NAME_TAKEN' ? error.message : undefined)

  const emailError =
    error?.fieldMessage('email') ??
    (error?.code === 'EMAIL_ALREADY_REGISTERED' ? error.message : undefined)

  const hasFieldError =
    teamNameError !== undefined ||
    emailError !== undefined ||
    error?.fieldMessage('password') !== undefined

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-amber-400">Registrar tripulacion</h1>
        <p className="mt-1 text-sm text-slate-400">Una sola cuenta por equipo.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Nombre de la tripulacion" error={teamNameError}>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className={inputClass}
              placeholder="Sabuesos de la Marea"
              minLength={3}
              maxLength={40}
              required
            />
          </Field>

          <Field label="Email" error={emailError}>
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

          <Field label="Contrasena (8 a 72 caracteres)" error={error?.fieldMessage('password')}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </Field>

          {error !== null && !hasFieldError && (
            <p className="text-sm text-red-400" role="alert">
              {error.message}
            </p>
          )}

          <button type="submit" disabled={sending} className={`${buttonClass} w-full`}>
            {sending ? 'Zarpando...' : 'Zarpar'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Ya tienen cuenta?{' '}
          <Link to="/login" className="text-amber-400 hover:underline">
            Iniciar sesion
          </Link>
        </p>
      </Card>
    </div>
  )
}
