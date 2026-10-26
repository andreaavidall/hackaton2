import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Spinner } from '../components/ui'

/**
 * Portero de las rutas privadas.
 *
 * Lo importante son los tres casos:
 * - 'checking': aun no sabemos si hay sesion -> mostramos un loader.
 *   Si aqui mandaramos al login, al recargar se veria un parpadeo del login
 *   aunque la sesion sea valida.
 * - 'anonymous': al login, guardando en el state a donde queria ir
 *   para devolverlo exactamente ahi despues de iniciar sesion.
 * - 'authenticated': pasa.
 */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Revisando el Log Pose..." />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

/**
 * Lee del state de la navegacion la ruta que el usuario queria abrir.
 * Devuelve pathname + search + hash para volver al sitio exacto
 * (incluidos los filtros del CP2, que viven en la query string).
 */
export function readReturnTo(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from: unknown = (state as { from: unknown }).from
    if (typeof from === 'object' && from !== null && 'pathname' in from) {
      const target = from as { pathname: string; search?: string; hash?: string }
      return target.pathname + (target.search ?? '') + (target.hash ?? '')
    }
  }
  return '/'
}
