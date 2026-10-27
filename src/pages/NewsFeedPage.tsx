import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ApiError, api, errorMessage } from '../api/client'
import type { NewsFeed, NewsItem } from '../api/types'
import {
  Card,
  EmptyState,
  ErrorBox,
  LogPoseRequired,
  Spinner,
  formatDate,
  inputClass,
} from '../components/ui'
import { readFeed, saveFeed, saveScroll, takeScroll } from './newsCache'
import {
  NEWS_PRIORITIES,
  NEWS_STATUSES,
  NEWS_TYPES,
  newsApiParams,
  newsKey,
  newsSearchParams,
  readNewsQuery,
  type NewsQuery,
} from './newsQuery'

export function NewsFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const query = readNewsQuery(searchParams)
  // La clave identifica la combinacion de filtros: con ella guardamos y
  // recuperamos el feed y el scroll.
  const key = newsKey(query)

  const [items, setItems] = useState<NewsItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  // Una sola carga en vuelo. Va en una ref y no en el estado porque el estado
  // se actualiza al siguiente render, y para entonces el observador ya podria
  // haber pedido otra carga.
  const loadingRef = useRef(false)

  // El AbortController de la carga en curso hace de identidad: solo la carga
  // cuyo controller sigue siendo el actual puede tocar el estado. Con eso,
  // cambiar de filtros a mitad de una carga ni mezcla resultados ni deja el
  // feed colgado, porque la anterior se aborta y suelta el testigo.
  const controllerRef = useRef<AbortController | null>(null)

  const sentinel = useRef<HTMLDivElement | null>(null)
  const scrollRestored = useRef(false)

  /** Anade sin repetir: la regla de Nami, nada se cuenta dos veces. */
  function merge(previous: NewsItem[], incoming: NewsItem[]): NewsItem[] {
    const seen = new Set(previous.map((item) => item.id))
    return [...previous, ...incoming.filter((item) => !seen.has(item.id))]
  }

  const load = useCallback(
    async (fromCursor: string | null) => {
      if (loadingRef.current) return
      loadingRef.current = true

      const controller = new AbortController()
      controllerRef.current = controller

      setLoading(true)
      setError(null)

      try {
        // La clave es la query string de los filtros, asi que la reusamos para
        // reconstruirlos sin depender del render actual.
        const current = readNewsQuery(new URLSearchParams(key))
        const feed = await api<NewsFeed>('/news/feed?' + newsApiParams(current, fromCursor), {
          signal: controller.signal,
        })

        // Si ya no somos la carga actual, esta respuesta es vieja: se tira.
        if (controllerRef.current !== controller) return

        setItems((previous) => merge(fromCursor === null ? [] : previous, feed.items))
        setCursor(feed.nextCursor)
        setHasMore(feed.hasMore)
      } catch (caught) {
        if (controller.signal.aborted || controllerRef.current !== controller) return
        // Importante: no tocamos `items`. Un error no borra lo ya cargado.
        setError(
          caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', errorMessage(caught)),
        )
      } finally {
        // Solo la carga vigente suelta los cerrojos. Si nos han reemplazado,
        // los deja puestos quien venga detras.
        if (controllerRef.current === controller) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    },
    [key],
  )

  // Primera carga, y recarga al cambiar de filtros.
  useEffect(() => {
    // Cambiamos de filtros: cortamos la carga anterior y soltamos el cerrojo,
    // para que la nueva pueda arrancar de inmediato.
    controllerRef.current?.abort()
    controllerRef.current = null
    loadingRef.current = false
    scrollRestored.current = false

    const cached = readFeed(key)
    if (cached !== null) {
      // Volvemos de un detalle: ya teniamos estas noticias, no las repedimos.
      setItems(cached.items)
      setCursor(cached.cursor)
      setHasMore(cached.hasMore)
      setError(null)
      return
    }

    setItems([])
    setCursor(null)
    setHasMore(true)
    setError(null)
    void load(null)
  }, [key, load])

  // Guardamos el feed para poder volver a el tal cual desde el detalle.
  useEffect(() => {
    if (items.length > 0) saveFeed(key, { items, cursor, hasMore })
  }, [key, items, cursor, hasMore])

  // El observador se crea una vez; esta ref le da siempre la version fresca
  // de la funcion de carga.
  const loadMore = () => {
    if (loadingRef.current || !hasMore || error !== null) return
    void load(cursor)
  }
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  // Carga automatica al llegar al final: cuando el centinela entra en pantalla
  // pedimos la siguiente tanda. No hay boton "Cargar mas".
  useEffect(() => {
    const element = sentinel.current
    if (element === null) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting === true) loadMoreRef.current()
      },
      // Empezamos a cargar un poco antes de llegar al borde.
      { rootMargin: '300px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Devuelve el feed a la altura en la que se dejo al abrir una noticia.
  useLayoutEffect(() => {
    if (items.length === 0 || scrollRestored.current) return
    const y = takeScroll(key)
    if (y > 0) window.scrollTo(0, y)
    scrollRestored.current = true
  }, [items, key])

  function updateFilter(changes: Partial<NewsQuery>): void {
    setSearchParams(newsSearchParams({ ...query, ...changes }))
  }

  const locked = error?.status === 423

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Noticias del mundo</h1>
        <p className="text-sm text-slate-400">
          {items.length === 0 ? 'Esperando al News Coo...' : items.length + ' noticias cargadas'}
        </p>
      </div>

      <Card className="grid gap-4 sm:grid-cols-3">
        <Filter
          label="Tipo"
          value={query.type}
          options={NEWS_TYPES}
          onChange={(value) => updateFilter({ type: value as NewsQuery['type'] })}
        />
        <Filter
          label="Prioridad"
          value={query.priority}
          options={NEWS_PRIORITIES}
          onChange={(value) => updateFilter({ priority: value as NewsQuery['priority'] })}
        />
        <Filter
          label="Estado"
          value={query.status}
          options={NEWS_STATUSES}
          onChange={(value) => updateFilter({ status: value as NewsQuery['status'] })}
        />
      </Card>

      {locked && error !== null ? (
        <LogPoseRequired message={error.message} />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={'/news/' + item.id}
                  state={{ search: location.search }}
                  onClick={() => saveScroll(key, window.scrollY)}
                  className="block rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-amber-500/50"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <StatusTag status={item.status} />
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                      {item.type}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                      {item.priority}
                    </span>
                    <span className="ml-auto text-slate-500">{formatDate(item.publishedAt)}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-100">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.source} · {item.island}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* Un error no borra lo cargado: se avisa abajo y se puede reintentar. */}
          {error !== null && (
            <ErrorBox message={error.message} onRetry={() => void load(cursor)} />
          )}

          {loading && <Spinner label="Cargando noticias..." />}

          {items.length === 0 && !loading && error === null && (
            <EmptyState
              title="No hay noticias con estos filtros."
              hint="Prueba quitando alguno."
            />
          )}

          {!hasMore && items.length > 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              Fin de las noticias. El News Coo no trae mas por hoy.
            </p>
          )}

          {/* Centinela: cuando entra en pantalla se pide la siguiente tanda. */}
          <div ref={sentinel} aria-hidden="true" className="h-px" />
        </>
      )}
    </div>
  )
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Todas</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function StatusTag({ status }: { status: NewsItem['status'] }) {
  const colors: Record<NewsItem['status'], string> = {
    RUMOR: 'bg-amber-900 text-amber-200',
    CONFIRMED: 'bg-emerald-900 text-emerald-200',
    DEBUNKED: 'bg-red-900 text-red-200',
  }
  return <span className={'rounded px-2 py-0.5 ' + colors[status]}>{status}</span>
}
