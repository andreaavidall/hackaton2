import type { WantedPage } from '../api/types'

/**
 * Memoria del listado mientras la pestana esta abierta.
 *
 * Problema que resuelve: al volver del detalle, el listado se montaba de cero,
 * mostraba el spinner y el scroll saltaba arriba. El enunciado pide que quede
 * "exactamente como se dejo".
 *
 * Son dos Map en memoria, escritos a mano: no es una libreria de cache de
 * servidor (esas estan prohibidas) ni se guarda nada en disco. Al recargar la
 * pagina se pierde, que es justo lo que queremos: los datos vuelven a pedirse.
 *
 * La clave es la query que se le manda a la API, asi cada combinacion de
 * filtros recuerda su propia pagina y su propio scroll.
 */
const pages = new Map<string, WantedPage>()
const scrollPositions = new Map<string, number>()

export function savePage(key: string, page: WantedPage): void {
  pages.set(key, page)
}

export function readCachedPage(key: string): WantedPage | null {
  return pages.get(key) ?? null
}

export function saveScroll(key: string, y: number): void {
  scrollPositions.set(key, y)
}

/** Devuelve el scroll guardado y lo olvida, para no re-aplicarlo mas tarde. */
export function takeScroll(key: string): number {
  const y = scrollPositions.get(key) ?? 0
  scrollPositions.delete(key)
  return y
}
