/// <reference types="vite/client" />

// Tipamos la variable de entorno para que la URL base sea `string` y no `any`.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
