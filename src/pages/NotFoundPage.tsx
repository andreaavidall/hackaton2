import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-bold text-amber-400">404</p>
        <h1 className="mt-4 text-xl font-semibold">Esta isla no esta en el mapa</h1>
        <p className="mt-2 text-slate-400">La ruta que buscas no existe.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-amber-500 px-4 py-2 font-medium text-slate-950 hover:bg-amber-400"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
