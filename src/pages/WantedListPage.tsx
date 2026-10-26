import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Crew, WantedPage } from '../api/types'
import { Card, EmptyState, ErrorBox, Spinner, formatBerries, inputClass } from '../components/ui'
import {
  FRUITS,
  SIZES,
  SORTS,
  STATUSES,
  readQuery,
  toApiParams,
  toSearchParams,
  type WantedQuery,
} from './wantedQuery'

export function WantedListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  // Todo el estado del listado sale de la URL, no de useState.
  // Por eso recargar, compartir el enlace o usar atras/adelante muestra lo mismo.
  const query = readQuery(searchParams)
  const { page, size, status, crewId, fruit, q, sort } = query

  const [data, setData] = useState<WantedPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [crews, setCrews] = useState<Crew[]>([])

  // Contador de peticiones: nos sirve para descartar respuestas viejas.
  const lastRequest = useRef(0)

  /** Cambia la URL, que es lo que dispara la recarga de datos. */
  function update(changes: Partial<WantedQuery>, replace = false): void {
    setSearchParams(toSearchParams({ ...query, ...changes }), { replace })
  }

  /**
   * Al tocar un filtro, la busqueda o el orden volvemos siempre a la pagina 0.
   * Si no, podrias quedarte en la pagina 5 de un resultado que ahora tiene
   * una sola pagina.
   */
  function updateFilter(changes: Partial<WantedQuery>): void {
    update({ ...changes, page: 0 })
  }

  // --- Carga del listado ------------------------------------------------
  useEffect(() => {
    const controller = new AbortController()
    const requestId = lastRequest.current + 1
    lastRequest.current = requestId

    setLoading(true)
    setError(null)

    api<WantedPage>('/wanted?' + toApiParams(query), { signal: controller.signal })
      .then((result) => {
        // Doble proteccion contra respuestas que llegan tarde: el abort corta
        // la peticion anterior, y este id descarta cualquier respuesta que no
        // sea la de la ultima peticion lanzada.
        if (requestId !== lastRequest.current) return
        setData(result)
        setLoading(false)
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        if (requestId !== lastRequest.current) return
        setError(errorMessage(caught))
        setLoading(false)
      })

    return () => controller.abort()
    // Dependemos de los valores sueltos y no del objeto `query`,
    // que se recrea en cada render.
  }, [page, size, status, crewId, fruit, q, sort, retry])

  // Las tripulaciones del filtro no dependen de los filtros: se cargan una vez.
  useEffect(() => {
    let cancelled = false
    api<Crew[]>('/crews')
      .then((result) => {
        if (!cancelled) setCrews(result)
      })
      .catch(() => {
        // El filtro de tripulacion es secundario: si falla, el listado sigue.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Si la URL pide una pagina que ya no existe (por ejemplo ?page=99 escrito a
  // mano), la corregimos a la ultima valida sin ensuciar el historial.
  useEffect(() => {
    if (data === null) return
    if (data.totalPages > 0 && page > data.totalPages - 1) {
      update({ page: data.totalPages - 1 }, true)
    }
  }, [data, page])

  // --- Busqueda con debounce --------------------------------------------
  const [text, setText] = useState(q)

  // Si la URL cambia por fuera (atras/adelante o enlace compartido),
  // el input tiene que seguirla.
  useEffect(() => {
    setText(q)
  }, [q])

  useEffect(() => {
    if (text === q) return
    // Cada tecla reinicia el temporizador: se dispara una sola peticion
    // 400 ms despues de la ultima letra, no una por tecla.
    const timer = setTimeout(() => {
      updateFilter({ q: text })
    }, 400)
    return () => clearTimeout(timer)
  }, [text, q])

  const totalPages = data?.totalPages ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Carteles de Se Busca</h1>
        <p className="text-sm text-slate-400">
          {data === null
            ? 'Cargando carteles...'
            : formatBerries(data.totalElements) + ' carteles encontrados'}
        </p>
      </div>

      <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Buscar</span>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nombre o epiteto"
            className={inputClass}
            maxLength={100}
          />
        </label>

        <Select
          label="Estado"
          value={status}
          onChange={(value) => updateFilter({ status: value as WantedQuery['status'] })}
          options={STATUSES}
          anyLabel="Todos"
        />

        <Select
          label="Fruta del diablo"
          value={fruit}
          onChange={(value) => updateFilter({ fruit: value as WantedQuery['fruit'] })}
          options={FRUITS}
          anyLabel="Todas"
        />

        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Tripulacion</span>
          <select
            value={crewId}
            onChange={(e) => updateFilter({ crewId: e.target.value })}
            className={inputClass}
          >
            <option value="">Todas</option>
            {crews.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name}
              </option>
            ))}
          </select>
        </label>

        <Select
          label="Ordenar por"
          value={sort}
          onChange={(value) => updateFilter({ sort: value as WantedQuery['sort'] })}
          options={SORTS}
        />

        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Por pagina</span>
          <select
            value={size}
            onChange={(e) => updateFilter({ size: Number(e.target.value) as WantedQuery['size'] })}
            className={inputClass}
          >
            {SIZES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {/* Altura minima fija: cargando, error y sin resultados ocupan el mismo
          espacio, asi la pagina no salta al cambiar de estado. */}
      <div className="min-h-[28rem]">
        {error !== null ? (
          <ErrorBox message={error} onRetry={() => setRetry((value) => value + 1)} />
        ) : data === null ? (
          <Spinner label="Buscando carteles..." />
        ) : data.content.length === 0 ? (
          <EmptyState
            title="Ningun cartel coincide con estos filtros."
            hint="Prueba quitando un filtro o cambiando la busqueda."
          />
        ) : (
          <ul className={'space-y-3 transition-opacity ' + (loading ? 'opacity-50' : '')}>
            {data.content.map((wanted) => (
              <li key={wanted.id}>
                <Link
                  to={'/wanted/' + wanted.id}
                  // Guardamos los filtros actuales para que Volver devuelva el
                  // listado exactamente como estaba.
                  state={{ search: location.search }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-amber-500/50"
                >
                  <span className="font-medium text-slate-100">{wanted.name}</span>
                  <span className="text-slate-500">{wanted.epithet}</span>
                  <span className="text-sm text-slate-400">{wanted.crew.name}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {wanted.status}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {wanted.devilFruit === null ? 'Sin fruta' : wanted.devilFruit.type}
                  </span>
                  <span className="ml-auto font-semibold text-amber-300">
                    {formatBerries(wanted.bounty)} berries
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 0 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => update({ page: page - 1 })}
            disabled={page <= 0 || loading}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-400">
            Pagina {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => update({ page: page + 1 })}
            disabled={page >= totalPages - 1 || loading}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  anyLabel?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {anyLabel !== undefined && <option value="">{anyLabel}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
