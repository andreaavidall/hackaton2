import type { ReactNode } from 'react'

/** Recompensas en berries con separador de miles. */
export function formatBerries(amount: number): string {
  return new Intl.NumberFormat('es-PE').format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-slate-400" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
      <span>{label}</span>
    </div>
  )
}

/** Error con reintento: siempre damos una salida al usuario, nunca un muro. */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-900 bg-red-950/50 p-6 text-center" role="alert">
      <p className="text-red-200">{message}</p>
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-700"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center">
      <p className="text-slate-300">{title}</p>
      {hint !== undefined && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </div>
  )
}

/** Campo de formulario con su error debajo, que es donde el enunciado lo pide. */
export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      {children}
      {error !== undefined && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 ' +
  'placeholder:text-slate-600 focus:border-amber-400 focus:outline-none'

export const buttonClass =
  'rounded-md bg-amber-500 px-4 py-2 font-medium text-slate-950 ' +
  'hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50'
