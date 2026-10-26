import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { team, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="font-semibold tracking-wide text-amber-400">
            Log Pose Console
          </Link>

          <nav className="flex gap-1 text-sm">
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/wanted" className={navLinkClass}>
              Se Busca
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            {team !== null && (
              <span className="text-slate-400">
                {team.name} · <span className="text-slate-300">{team.code}</span>
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base = 'rounded-md px-3 py-1.5'
  return isActive ? `${base} bg-slate-800 text-amber-300` : `${base} text-slate-300 hover:bg-slate-800`
}
