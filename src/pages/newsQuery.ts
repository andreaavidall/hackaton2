import type { NewsPriority, NewsStatus, NewsType } from '../api/types'

// Mismo criterio que en los carteles: lo que llega por la URL se compara
// contra la lista de valores que acepta la API, y si no esta, se ignora.
export const NEWS_TYPES = [
  'BOUNTY_UPDATE',
  'BATTLE',
  'MARINE_OPERATION',
  'WORLD_GOVERNMENT',
  'DISCOVERY',
] as const

export const NEWS_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const NEWS_STATUSES = ['RUMOR', 'CONFIRMED', 'DEBUNKED'] as const

/** Cuantas noticias pedimos por carga (el maximo que acepta la API es 30). */
export const NEWS_LIMIT = 20

export type NewsQuery = {
  type: NewsType | ''
  priority: NewsPriority | ''
  status: NewsStatus | ''
}

export function readNewsQuery(params: URLSearchParams): NewsQuery {
  return {
    type: readOption(params.get('type'), NEWS_TYPES),
    priority: readOption(params.get('priority'), NEWS_PRIORITIES),
    status: readOption(params.get('status'), NEWS_STATUSES),
  }
}

function readOption<T extends string>(raw: string | null, allowed: readonly T[]): T | '' {
  if (raw === null) return ''
  return allowed.includes(raw as T) ? (raw as T) : ''
}

/** Estado -> URL. Los filtros vacios no se escriben. */
export function newsSearchParams(query: NewsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.type !== '') params.set('type', query.type)
  if (query.priority !== '') params.set('priority', query.priority)
  if (query.status !== '') params.set('status', query.status)
  return params
}

/**
 * Estado -> query para la API.
 * El cursor va aparte porque no vive en la URL: es un detalle de la carga,
 * no algo que el usuario deba poder compartir ni reconstruir.
 */
export function newsApiParams(query: NewsQuery, cursor: string | null): string {
  const params = new URLSearchParams({ limit: String(NEWS_LIMIT) })
  if (query.type !== '') params.set('type', query.type)
  if (query.priority !== '') params.set('priority', query.priority)
  if (query.status !== '') params.set('status', query.status)
  if (cursor !== null) params.set('cursor', cursor)
  return params.toString()
}

/** Clave estable de una combinacion de filtros, para la memoria del feed. */
export function newsKey(query: NewsQuery): string {
  return newsSearchParams(query).toString()
}
