import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError, api, errorMessage } from '../api/client'
import type { NewsDetail, NewsVerdict } from '../api/types'
import { Card, ErrorBox, LogPoseRequired, Spinner, formatDate } from '../components/ui'
import { updateNewsEverywhere } from './newsCache'
import { StatusTag } from './NewsFeedPage'

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const [news, setNews] = useState<NewsDetail | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  // Estado propio de la verificacion, separado del de la carga: un fallo al
  // verificar no debe borrar la noticia que ya estamos mostrando.
  const [verdictSending, setVerdictSending] = useState<NewsVerdict | null>(null)
  const [verdictError, setVerdictError] = useState<string | null>(null)
  const [verdictDone, setVerdictDone] = useState<string | null>(null)

  const backTo = '/news' + readSearch(location.state)

  const load = useCallback(async () => {
    if (id === undefined) return
    setLoading(true)
    setError(null)
    try {
      setNews(await api<NewsDetail>('/news/' + id))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', errorMessage(caught)))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  /** Verifica el rumor. Solo se puede pasar de RUMOR a CONFIRMED o DEBUNKED. */
  async function verify(verdict: NewsVerdict): Promise<void> {
    if (id === undefined || verdictSending !== null) return

    setVerdictSending(verdict)
    setVerdictError(null)
    setVerdictDone(null)

    try {
      const updated = await api<NewsDetail>('/news/' + id + '/status', {
        method: 'PATCH',
        body: { status: verdict },
      })
      setNews(updated)
      // Para que el feed muestre el estado nuevo al volver, sin repedirlo.
      updateNewsEverywhere(updated)
      setVerdictDone(
        verdict === 'CONFIRMED' ? 'Noticia confirmada.' : 'Noticia desmentida.',
      )
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409 && caught.current !== undefined) {
        // Alguien la verifico antes que nosotros: nos quedamos con su estado real.
        setNews(caught.current)
        updateNewsEverywhere(caught.current)
        setVerdictError('Esta noticia ya habia sido verificada. Actualizamos su estado.')
      } else {
        // El estado anterior se conserva: solo mostramos el error.
        setVerdictError(errorMessage(caught))
      }
    } finally {
      setVerdictSending(null)
    }
  }

  if (loading) return <Spinner label="Abriendo la noticia..." />

  if (error !== null) {
    if (error.status === 423) return <LogPoseRequired message={error.message} />
    if (error.status === 404) {
      return (
        <Card>
          <p className="text-slate-300">Esta noticia no existe.</p>
        </Card>
      )
    }
    return <ErrorBox message={error.message} onRetry={() => void load()} />
  }

  if (news === null) return null

  return (
    <div className="space-y-6">
      <Link to={backTo} className="inline-block text-sm text-amber-400 hover:underline">
        Volver al feed
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusTag status={news.status} />
          <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{news.type}</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{news.priority}</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{news.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {news.source} · {news.island} · {formatDate(news.publishedAt)}
        </p>
      </div>

      <Card>
        <p className="text-slate-300">{news.summary}</p>
        {news.body.map((paragraph, index) => (
          <p key={index} className="mt-3 text-slate-300">
            {paragraph}
          </p>
        ))}
      </Card>

      {news.relatedWanted !== null && (
        <Card>
          <h2 className="font-medium text-slate-200">Cartel relacionado</h2>
          <Link
            to={'/wanted/' + news.relatedWanted.id}
            className="mt-2 inline-block text-amber-300 hover:underline"
          >
            {news.relatedWanted.name}
          </Link>
        </Card>
      )}

      <Card>
        <h2 className="font-medium text-slate-200">Verificacion</h2>

        {news.status === 'RUMOR' ? (
          <>
            <p className="mt-2 text-sm text-slate-400">
              Este rumor esta sin verificar. Decide si se confirma o se desmiente.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void verify('CONFIRMED')}
                disabled={verdictSending !== null}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verdictSending === 'CONFIRMED' ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => void verify('DEBUNKED')}
                disabled={verdictSending !== null}
                className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verdictSending === 'DEBUNKED' ? 'Desmintiendo...' : 'Desmentir'}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            Ya esta verificada como {news.status}
            {news.verifiedAt !== null && ' el ' + formatDate(news.verifiedAt)}.
          </p>
        )}

        {verdictDone !== null && (
          <p className="mt-4 text-sm text-emerald-300" role="status">
            {verdictDone}
          </p>
        )}

        {verdictError !== null && (
          <div className="mt-4 rounded-md border border-red-900 bg-red-950/50 p-3" role="alert">
            <p className="text-sm text-red-200">{verdictError}</p>
            {news.status === 'RUMOR' && (
              <p className="mt-1 text-xs text-slate-400">
                El rumor sigue sin verificar: puedes volver a intentarlo.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

/** Saca del state de la navegacion los filtros del feed que nos trajo aqui. */
function readSearch(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'search' in state) {
    const search: unknown = (state as { search: unknown }).search
    if (typeof search === 'string') return search
  }
  return ''
}
