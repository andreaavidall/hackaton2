import type { NewsItem } from '../api/types'

/**
 * Memoria del feed mientras la pestana esta abierta.
 *
 * Problema que resuelve: al cerrar el detalle de una noticia, el feed tenia
 * que volver a pedir todo lo que ya habia cargado y el usuario perdia su
 * sitio. El enunciado pide que conserve la posicion "sin volver a pedir lo
 * que ya tenia".
 *
 * Igual que la del listado de carteles: Map en memoria escrito a mano, no una
 * libreria de cache. Se pierde al recargar, que es lo correcto.
 */
type FeedState = {
  items: NewsItem[]
  cursor: string | null
  hasMore: boolean
}

const feeds = new Map<string, FeedState>()
const scrollPositions = new Map<string, number>()

export function saveFeed(key: string, state: FeedState): void {
  feeds.set(key, state)
}

export function readFeed(key: string): FeedState | null {
  return feeds.get(key) ?? null
}

export function saveScroll(key: string, y: number): void {
  scrollPositions.set(key, y)
}

export function takeScroll(key: string): number {
  const y = scrollPositions.get(key) ?? 0
  scrollPositions.delete(key)
  return y
}

/**
 * Al verificar un rumor desde el detalle, el feed guardado se queda con el
 * estado viejo. Esto lo actualiza en todas las combinaciones de filtros que
 * tengan esa noticia, para que al volver se vea el estado nuevo.
 */
export function updateNewsEverywhere(updated: NewsItem): void {
  for (const [key, state] of feeds) {
    if (!state.items.some((item) => item.id === updated.id)) continue
    feeds.set(key, {
      ...state,
      items: state.items.map((item) => (item.id === updated.id ? updated : item)),
    })
  }
}
