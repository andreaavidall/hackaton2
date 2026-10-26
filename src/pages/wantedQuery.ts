import type { FruitFilter, WantedStatus } from '../api/types'

// Valores que la API acepta. Todo lo que llegue por la URL se compara contra
// estas listas: si no esta, se usa el valor por defecto en vez de romper la vista.
export const SIZES = [10, 20, 50] as const
export const STATUSES = ['AT_LARGE', 'CAPTURED', 'MISSING'] as const
export const FRUITS = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'] as const
export const SORTS = ['bounty,desc', 'name,asc', 'updatedAt,desc'] as const

export type Size = (typeof SIZES)[number]
export type Sort = (typeof SORTS)[number]

/** Estado completo del listado. La URL es la unica fuente de verdad. */
export type WantedQuery = {
  page: number
  size: Size
  status: WantedStatus | ''
  crewId: string
  fruit: FruitFilter | ''
  q: string
  sort: Sort
}

const DEFAULT_SIZE: Size = 20
const DEFAULT_SORT: Sort = 'bounty,desc'

/**
 * Lee el estado desde la query string, validando cada valor.
 * `?page=-5&size=7&sort=loquesea` no explota: cae en los valores por defecto.
 */
export function readQuery(params: URLSearchParams): WantedQuery {
  return {
    page: readPage(params.get('page')),
    size: readOption(params.get('size'), SIZES, DEFAULT_SIZE, Number),
    status: readOption(params.get('status'), STATUSES, '' as const),
    fruit: readOption(params.get('fruit'), FRUITS, '' as const),
    sort: readOption(params.get('sort'), SORTS, DEFAULT_SORT),
    crewId: params.get('crewId') ?? '',
    q: params.get('q') ?? '',
  }
}

function readPage(raw: string | null): number {
  const page = Number(raw)
  if (raw === null || !Number.isInteger(page) || page < 0) return 0
  return page
}

/** Devuelve el valor solo si pertenece a la lista permitida. */
function readOption<T, F>(
  raw: string | null,
  allowed: readonly T[],
  fallback: F,
  parse: (value: string) => unknown = (value) => value,
): T | F {
  if (raw === null) return fallback
  const parsed = parse(raw)
  return allowed.includes(parsed as T) ? (parsed as T) : fallback
}

/**
 * Estado -> query string de la URL.
 * Omitimos lo vacio y lo que ya es el valor por defecto para que la URL que
 * se comparte quede corta; al leerla, los defaults vuelven solos.
 */
export function toSearchParams(query: WantedQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.page > 0) params.set('page', String(query.page))
  if (query.size !== DEFAULT_SIZE) params.set('size', String(query.size))
  if (query.status !== '') params.set('status', query.status)
  if (query.fruit !== '') params.set('fruit', query.fruit)
  if (query.crewId !== '') params.set('crewId', query.crewId)
  if (query.q.trim() !== '') params.set('q', query.q.trim())
  if (query.sort !== DEFAULT_SORT) params.set('sort', query.sort)
  return params
}

/** Estado -> query string para la API (aqui si mandamos page, size y sort siempre). */
export function toApiParams(query: WantedQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    size: String(query.size),
    sort: query.sort,
  })
  if (query.status !== '') params.set('status', query.status)
  if (query.fruit !== '') params.set('fruit', query.fruit)
  if (query.crewId !== '') params.set('crewId', query.crewId)
  if (query.q.trim() !== '') params.set('q', query.q.trim())
  return params.toString()
}
