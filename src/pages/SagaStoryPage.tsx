import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, api, errorMessage } from '../api/client'
import type { SagaStage, SagaStory } from '../api/types'
import { Card, ErrorBox, LogPoseRequired, Spinner } from '../components/ui'
import './sagaStory.css'

/** ¿La persona pidio menos movimiento en su sistema? */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** ¿El navegador soporta animaciones ligadas al scroll? */
function supportsScrollAnimations(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')
}

export function SagaStoryPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [story, setStory] = useState<SagaStory | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  // Etapa activa: la que manda sobre los colores, las metricas y la URL.
  const [activeIndex, setActiveIndex] = useState(0)

  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const deepLinkDone = useRef(false)

  const [scrollAnimations] = useState(supportsScrollAnimations)

  const load = useCallback(async () => {
    if (id === undefined) return
    setLoading(true)
    setError(null)
    try {
      setStory(await api<SagaStory>('/sagas/' + id + '/story'))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', errorMessage(caught)))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const stages = story?.stages ?? []

  // Al abrir la pagina con ?etapa=<slug> vamos directo a esa etapa.
  useEffect(() => {
    if (stages.length === 0 || deepLinkDone.current) return
    deepLinkDone.current = true

    const slug = searchParams.get('etapa')
    if (slug === null) return

    const index = stages.findIndex((stage) => stage.slug === slug)
    if (index < 0) return

    setActiveIndex(index)
    // 'auto' y no 'smooth': al abrir un enlace queremos estar ya alli.
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [stages, searchParams])

  // Deteccion de la etapa activa por scroll. El margen negativo deja como
  // activa solo la seccion que cruza el centro de la pantalla.
  useEffect(() => {
    if (stages.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = sectionRefs.current.indexOf(entry.target as HTMLElement)
          if (index >= 0) setActiveIndex(index)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )

    for (const section of sectionRefs.current) {
      if (section !== null) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [stages])

  // La URL refleja la etapa activa, con replace para no llenar el historial.
  useEffect(() => {
    const active = stages[activeIndex]
    if (active === undefined) return
    if (searchParams.get('etapa') === active.slug) return

    const next = new URLSearchParams(searchParams)
    next.set('etapa', active.slug)
    setSearchParams(next, { replace: true })
  }, [activeIndex, stages, searchParams, setSearchParams])

  /** Navegacion por teclado: mueve el foco a la etapa, no solo el scroll. */
  function goToStage(index: number): void {
    const section = sectionRefs.current[index]
    if (section === undefined || section === null) return
    section.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
    section.focus({ preventScroll: true })
    setActiveIndex(index)
  }

  if (loading) return <Spinner label="Leyendo el poneglyph..." />
  if (error !== null && error.status === 423) return <LogPoseRequired message={error.message} />
  if (error !== null && error.status === 404) {
    return (
      <Card>
        <p className="text-slate-300">Esta saga no existe.</p>
      </Card>
    )
  }
  if (error !== null) return <ErrorBox message={error.message} onRetry={() => void load()} />
  if (story === null) return null

  const active: SagaStage | undefined = stages[activeIndex]
  const palette = active?.palette ?? story.saga.palette
  const progress = stages.length === 0 ? 0 : (activeIndex + 1) / stages.length

  return (
    <div
      className="saga rounded-lg p-4 sm:p-6"
      style={{
        // Los colores de la etapa activa entran como variables CSS: el resto
        // del scrollytelling las lee desde la hoja de estilos.
        ['--saga-bg' as string]: palette.background,
        ['--saga-surface' as string]: palette.surface,
        ['--saga-text' as string]: palette.text,
        ['--saga-accent' as string]: palette.accent,
        ['--saga-primary' as string]: palette.primary,
      }}
    >
      <Link to="/sagas" viewTransition className="text-sm underline opacity-80">
        Volver a las sagas
      </Link>

      <header className="mt-4" style={{ viewTransitionName: 'saga-' + story.saga.id }}>
        <p className="text-xs uppercase tracking-wide" style={{ color: palette.accent }}>
          Saga {story.saga.order}
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: palette.primary }}>
          {story.saga.title}
        </h1>
        <p className="opacity-80">{story.saga.subtitle}</p>
        <p className="mt-3 max-w-2xl opacity-90">{story.saga.intro}</p>
      </header>

      {/* Progreso del recorrido. Si el navegador soporta scroll-driven
          animations, la barra sigue el scroll sola; si no, se calcula con la
          etapa activa. El texto de al lado funciona en ambos casos. */}
      <div className="mt-6">
        <div className="mb-1 flex justify-between text-xs opacity-80">
          <span>
            Etapa {activeIndex + 1} de {stages.length}
          </span>
          <span>{active?.island.name}</span>
        </div>
        <div className="saga-progress-track">
          <div
            className={
              'saga-progress-fill' + (scrollAnimations ? ' saga-progress-fill--scroll' : '')
            }
            style={scrollAnimations ? undefined : { transform: 'scaleX(' + progress + ')' }}
          />
        </div>
      </div>

      {/* Navegacion por teclado entre etapas. Son botones reales, asi que se
          alcanzan con Tab y se activan con Enter o Espacio. */}
      <nav aria-label="Etapas de la saga" className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => goToStage(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          style={{ borderColor: palette.accent }}
        >
          Etapa anterior
        </button>
        <button
          type="button"
          onClick={() => goToStage(activeIndex + 1)}
          disabled={activeIndex >= stages.length - 1}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          style={{ borderColor: palette.accent }}
        >
          Etapa siguiente
        </button>
        <ol className="flex flex-wrap gap-1">
          {stages.map((stage, index) => (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => goToStage(index)}
                aria-current={index === activeIndex ? 'step' : undefined}
                className="rounded px-2 py-1 text-xs"
                style={{
                  background: index === activeIndex ? palette.accent : 'transparent',
                  color: index === activeIndex ? palette.background : palette.text,
                }}
              >
                {stage.order}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="saga-layout mt-6">
        {/* --- Mapa persistente --- */}
        <aside className="saga-map">
          <h2 className="sr-only">Mapa del Grand Line</h2>
          <svg
            viewBox={'0 0 ' + story.map.width + ' ' + story.map.height}
            className="w-full"
            role="img"
            aria-label={
              'Ruta de la saga. Barco en ' + (active?.island.name ?? story.saga.firstIsland)
            }
          >
            {/* Ruta completa, tenue */}
            <polyline
              points={stages.map((s) => s.island.x + ',' + s.island.y).join(' ')}
              fill="none"
              stroke={palette.text}
              strokeOpacity={0.2}
              strokeWidth={3}
              strokeDasharray="8 8"
            />
            {/* Ruta ya recorrida: crece con la etapa activa */}
            <polyline
              className="saga-route-done"
              points={stages
                .slice(0, activeIndex + 1)
                .map((s) => s.island.x + ',' + s.island.y)
                .join(' ')}
              fill="none"
              stroke={palette.accent}
              strokeWidth={4}
              strokeLinecap="round"
            />
            {stages.map((stage, index) => (
              <g key={stage.id}>
                <circle
                  cx={stage.island.x}
                  cy={stage.island.y}
                  r={index === activeIndex ? 10 : 6}
                  fill={index <= activeIndex ? palette.primary : palette.surface}
                  stroke={palette.text}
                  strokeOpacity={0.4}
                />
              </g>
            ))}
            {/* El barco se coloca en la isla de la etapa activa */}
            {active !== undefined && (
              <g
                className="saga-ship"
                style={{
                  transform: 'translate(' + active.island.x + 'px, ' + active.island.y + 'px)',
                }}
              >
                <circle r={14} fill={palette.accent} fillOpacity={0.25} />
                <path d="M -8 4 L 8 4 L 5 10 L -5 10 Z" fill={palette.primary} />
                <path d="M 0 -10 L 0 4 M 0 -10 L 7 -2 L 0 -2" fill="none" stroke={palette.primary} strokeWidth={2} />
              </g>
            )}
          </svg>

          {/* Metricas de la etapa activa: siempre las suyas, nunca mezcladas. */}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {(active?.metrics ?? []).map((metric) => (
              <div key={metric.key} className="rounded-md p-2" style={{ background: palette.background }}>
                <dt className="text-xs opacity-70">{metric.label}</dt>
                <dd className="text-lg font-semibold" style={{ color: palette.primary }}>
                  {metric.value} <span className="text-xs opacity-70">{metric.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </aside>

        {/* --- Narrativa por etapas --- */}
        <div className="saga-stages">
          {stages.map((stage, index) => (
            <section
              key={stage.id}
              id={stage.slug}
              // tabIndex -1: no entra en el orden de tabulacion, pero si puede
              // recibir el foco cuando saltamos a la etapa con los botones.
              tabIndex={-1}
              ref={(element) => {
                sectionRefs.current[index] = element
              }}
              aria-label={'Etapa ' + stage.order + ': ' + stage.title}
              className="saga-stage"
            >
              <div className="saga-stage-body">
                <p className="text-xs uppercase tracking-wide" style={{ color: palette.accent }}>
                  Etapa {stage.order} · {stage.island.name}
                </p>
                <h2 className="mt-1 text-2xl font-semibold" style={{ color: palette.primary }}>
                  {stage.title}
                </h2>
                {stage.narrative.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="mt-3 opacity-90">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
