// Unico punto por donde la app habla con la API.
// Centralizarlo aqui nos da gratis: la URL base, el token en cada request
// y un formato de error igual para todas las pantallas.

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL

// El .env no se versiona, asi que avisamos fuerte si falta en vez de dejar que
// todas las peticiones salgan hacia "undefined/...".
if (BASE_URL === undefined || BASE_URL === '') {
  throw new Error('Falta VITE_API_BASE_URL. Copia .env.example como .env y vuelve a levantar Vite.')
}

const TOKEN_KEY = 'logpose_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token === null) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

/** Detalle de un 400 VALIDATION_ERROR: que campo fallo y por que. */
export type FieldError = { field: string; message: string }

/** Error de la API ya normalizado, para que las pantallas no parseen JSON. */
export class ApiError extends Error {
  status: number
  code: string
  details: FieldError[]

  constructor(status: number, code: string, message: string, details: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Mensaje que corresponde a un campo del formulario, si el error trae uno. */
  fieldMessage(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message
  }
}

// La sesion vive en AuthProvider, pero el 401 lo detecta el cliente.
// El provider deja aqui su funcion de "cerrar sesion" para no acoplarlos.
let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  signal?: AbortSignal
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const token = getToken()

  const response = await fetch(BASE_URL + path, {
    method: options.method ?? 'GET',
    signal: options.signal,
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const error = await toApiError(response)

    // Token vencido o invalido: la app entera vuelve al login.
    // Se excluye /auth/ porque ahi un 401 significa "credenciales malas",
    // no "se te vencio la sesion".
    if (response.status === 401 && !path.startsWith('/auth/')) {
      onUnauthorized?.()
    }
    throw error
  }

  return (await response.json()) as T
}

/** Convierte el cuerpo de error de la API en un ApiError. */
async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const data = body as Partial<{ code: string; message: string; details: FieldError[] }>
      return new ApiError(
        response.status,
        data.code ?? 'UNKNOWN',
        data.message ?? 'Algo salio mal.',
        data.details ?? [],
      )
    }
  } catch {
    // El cuerpo no era JSON (por ejemplo, un 502 del proxy).
  }
  return new ApiError(response.status, 'UNKNOWN', 'No pudimos contactar a la API.')
}

/** Mensaje mostrable venga de donde venga el error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Algo salio mal.'
}
