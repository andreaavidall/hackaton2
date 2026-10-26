import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError, api, errorMessage } from '../api/client'
import type { WantedDetail } from '../api/types'
import { Card, ErrorBox, Spinner, formatBerries, formatDate } from '../components/ui'

export function WantedDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const [wanted, setWanted] = useState<WantedDetail | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  // El listado nos paso sus filtros en el state de la navegacion, asi que
  // Volver reconstruye la misma URL del listado. Si alguien entra directo a
  // este detalle no hay filtros que recordar y vamos al listado limpio.
  const backTo = '/wanted' + readSearch(location.state)

  const load = useCallback(async () => {
    if (id === undefined) return
    setLoading(true)
    setError(null)
    try {
      setWanted(await api<WantedDetail>('/wanted/' + id))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', errorMessage(caught)))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <Link to={backTo} className="inline-block text-sm text-amber-400 hover:underline">
        Volver a los carteles
      </Link>

      {loading ? (
        <Spinner label="Abriendo el cartel..." />
      ) : error !== null ? (
        error.status === 404 ? (
          <Card>
            <p className="text-slate-300">Este cartel no existe o fue retirado.</p>
          </Card>
        ) : (
          <ErrorBox message={error.message} onRetry={() => void load()} />
        )
      ) : wanted === null ? null : (
        <>
          <div>
            <h1 className="text-2xl font-semibold">{wanted.name}</h1>
            <p className="text-slate-400">{wanted.epithet}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Recompensa" value={formatBerries(wanted.bounty) + ' berries'} />
            <Fact label="Estado" value={wanted.status} />
            <Fact label="Amenaza" value={wanted.threatLevel + ' de 5'} />
            <Fact label="Puesto" value={wanted.role} />
          </div>

          <Card>
            <h2 className="font-medium text-slate-200">Ficha</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Tripulacion" value={wanted.crew.name} />
              <Row label="Edad" value={String(wanted.age)} />
              <Row label="Estatura" value={wanted.heightCm + ' cm'} />
              <Row
                label="Fruta del diablo"
                value={
                  wanted.devilFruit === null
                    ? 'No comio ninguna'
                    : wanted.devilFruit.name + ' (' + wanted.devilFruit.type + ')'
                }
              />
              <Row
                label="Visto por ultima vez"
                value={wanted.lastSeen.island + ' · ' + formatDate(wanted.lastSeen.seenAt)}
              />
              <Row label="Actualizado" value={formatDate(wanted.updatedAt)} />
            </dl>
          </Card>

          <Card>
            <h2 className="font-medium text-slate-200">Resena</h2>
            <p className="mt-2 text-slate-300">{wanted.bio}</p>
          </Card>

          <Card>
            <h2 className="font-medium text-slate-200">Historial de recompensas</h2>
            <ul className="mt-3 divide-y divide-slate-800 text-sm">
              {wanted.bountyHistory.map((entry) => (
                <li key={entry.issuedAt} className="flex justify-between py-2">
                  <span className="text-slate-400">{formatDate(entry.issuedAt)}</span>
                  <span className="text-slate-200">{formatBerries(entry.amount)} berries</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-amber-300">{value}</p>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-800 pb-1">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-200">{value}</dd>
    </div>
  )
}

/** Saca la query string del listado que nos mando aqui, si viene. */
function readSearch(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'search' in state) {
    const search: unknown = (state as { search: unknown }).search
    if (typeof search === 'string') return search
  }
  return ''
}
