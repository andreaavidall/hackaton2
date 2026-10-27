import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api, errorMessage } from '../api/client'
import type { SagaSummary } from '../api/types'
import { Card, EmptyState, ErrorBox, LogPoseRequired, Spinner } from '../components/ui'

export function SagasPage() {
  const [sagas, setSagas] = useState<SagaSummary[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSagas(await api<SagaSummary[]>('/sagas'))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', errorMessage(caught)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Spinner label="Descifrando poneglyphs..." />
  if (error !== null && error.status === 423) return <LogPoseRequired message={error.message} />
  if (error !== null) return <ErrorBox message={error.message} onRetry={() => void load()} />
  if (sagas === null) return null

  if (sagas.length === 0) {
    return <EmptyState title="Todavia no hay sagas registradas." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">La gran saga</h1>
        <p className="text-sm text-slate-400">
          Los poneglyphs guardan la verdadera historia del mundo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sagas.map((saga) => (
          <Link
            key={saga.id}
            to={'/sagas/' + saga.id}
            // La View Transition API se usa si el navegador la soporta; si no,
            // React Router hace una navegacion normal.
            viewTransition
            className="block rounded-lg border p-5 transition-colors"
            style={{
              borderColor: saga.palette.surface,
              background: saga.palette.background,
              color: saga.palette.text,
              // Nombre compartido con el titulo de la historia: es lo que la
              // View Transition anima de una pantalla a la otra.
              viewTransitionName: 'saga-' + saga.id,
            }}
          >
            <p className="text-xs uppercase tracking-wide" style={{ color: saga.palette.accent }}>
              Saga {saga.order}
            </p>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: saga.palette.primary }}>
              {saga.title}
            </h2>
            <p className="text-sm opacity-80">{saga.subtitle}</p>
            <p className="mt-3 text-sm opacity-90">{saga.synopsis}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs opacity-80">
              <div>
                <dt className="opacity-70">Etapas</dt>
                <dd>{saga.stageCount}</dd>
              </div>
              <div>
                <dt className="opacity-70">Distancia</dt>
                <dd>{saga.totalDistanceNm} mn</dd>
              </div>
              <div>
                <dt className="opacity-70">Desde</dt>
                <dd>{saga.firstIsland}</dd>
              </div>
              <div>
                <dt className="opacity-70">Hasta</dt>
                <dd>{saga.lastIsland}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>

      <Card>
        <p className="text-sm text-slate-400">
          Cada saga se cuenta como un recorrido: el mapa sigue al barco mientras
          avanzas por las etapas.
        </p>
      </Card>
    </div>
  )
}
