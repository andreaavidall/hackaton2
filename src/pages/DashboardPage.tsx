import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { DashboardSummary, LogPose } from '../api/types'
import {
  Card,
  EmptyState,
  ErrorBox,
  Spinner,
  formatBerries,
  formatDate,
} from '../components/ui'

type Data = { summary: DashboardSummary; logPose: LogPose }

export function DashboardPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // useCallback para poder reutilizar la misma carga en el boton "Reintentar".
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Las dos peticiones son independientes, van en paralelo.
      const [summary, logPose] = await Promise.all([
        api<DashboardSummary>('/dashboard/summary'),
        api<LogPose>('/log-pose'),
      ])
      setData({ summary, logPose })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Spinner label="Leyendo el Log Pose..." />
  if (error !== null) return <ErrorBox message={error} onRetry={() => void load()} />
  if (data === null) return null

  const { summary, logPose } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tripulacion {summary.team.name}</h1>
        <p className="text-sm text-slate-400">
          Codigo {summary.team.code} · datos al {formatDate(summary.generatedAt)}
        </p>
      </div>

      {/* Estado del Log Pose: es lo que decide si el Grand Line esta abierto. */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              logPose.grandLineUnlocked
                ? 'bg-emerald-900 text-emerald-200'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            Log Pose: {logPose.status}
          </span>
          <p className="text-sm text-slate-300">{logPose.message}</p>
        </div>
      </Card>

      {/* Workspace recien creado: no hay carteles todavia. */}
      {summary.wanted.total === 0 ? (
        <EmptyState
          title="Todavia no hay carteles en el workspace."
          hint="Cuando la Guild publique carteles apareceran aqui y en Se Busca."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Carteles" value={formatBerries(summary.wanted.total)} />
            <Metric label="Recompensa total" value={formatBerries(summary.wanted.totalBounty)} />
            <Metric label="Promedio" value={formatBerries(summary.wanted.averageBounty)} />
            <Metric label="Tripulaciones" value={formatBerries(summary.crews.total)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-medium text-slate-200">Por estado</h2>
              <ul className="mt-3 space-y-1 text-sm text-slate-300">
                {Object.entries(summary.wanted.byStatus).map(([status, count]) => (
                  <li key={status} className="flex justify-between">
                    <span>{status}</span>
                    <span className="text-slate-100">{count}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="font-medium text-slate-200">Por fruta del diablo</h2>
              <ul className="mt-3 space-y-1 text-sm text-slate-300">
                {Object.entries(summary.wanted.byFruit).map(([fruit, count]) => (
                  <li key={fruit} className="flex justify-between">
                    <span>{fruit}</span>
                    <span className="text-slate-100">{count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {summary.crews.mostWanted !== null && (
            <Card>
              <h2 className="font-medium text-slate-200">Tripulacion mas buscada</h2>
              <p className="mt-2 text-slate-300">
                {summary.crews.mostWanted.name} · barco {summary.crews.mostWanted.shipName} ·{' '}
                {summary.crews.mostWanted.memberCount} carteles ·{' '}
                {formatBerries(summary.crews.mostWanted.totalBounty)} berries
              </p>
            </Card>
          )}

          <Card>
            <h2 className="font-medium text-slate-200">Mayores recompensas</h2>
            <ul className="mt-3 divide-y divide-slate-800">
              {summary.topBounties.map((wanted) => (
                <li key={wanted.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link to={`/wanted/${wanted.id}`} className="text-amber-300 hover:underline">
                    {wanted.name} <span className="text-slate-500">"{wanted.epithet}"</span>
                  </Link>
                  <span className="text-slate-300">{formatBerries(wanted.bounty)} berries</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-amber-300">{value}</p>
    </Card>
  )
}
