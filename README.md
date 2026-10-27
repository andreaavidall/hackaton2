# Log Pose Console

Consola de la Guild de Cazarrecompensas para el hackathon de frontend de CS2031-DBP.
React + TypeScript + Vite + Tailwind, contra la API del curso.

El enunciado completo está en [docs/ENUNCIADO.md](docs/ENUNCIADO.md).

## Integrantes

> **PENDIENTE:** completar antes de la entrega.

| Nombre | Código |
|:-------|:-------|
| Andrea Vidal | _por completar_ |
| _por completar_ | _por completar_ |
| _por completar_ | _por completar_ |

Tripulación: **GRUPO4** · código de equipo **TEAM-039**

## Requisitos

- Node 24 LTS
- npm

## Cómo ejecutar

```bash
npm install
cp .env.example .env
npm run dev
```

La app queda en http://localhost:5173

> El segundo paso **no es opcional**: el `.env` no se versiona, y sin él la app
> no sabe a qué API pedir y se detiene con un error al arrancar.
> En PowerShell, el comando es `Copy-Item .env.example .env`.

Para compilar la versión de producción:

```bash
npm run build
```

## Variables de entorno

Una sola, en el `.env`:

| Variable | Valor |
|:---------|:------|
| `VITE_API_BASE_URL` | `https://logpose-api-jg7f.onrender.com/api/v1` |

La URL no está escrita en el código: se lee de esta variable.

## Cuenta

Una sola cuenta por tripulación. Se crea desde `/register` en la propia app y
entra con la sesión ya iniciada. Los tres integrantes entran con ese mismo
email y contraseña desde `/login`.

La contraseña no está en el repositorio ni debe subirse.

## Rutas

| Ruta | Qué es | Acceso |
|:-----|:-------|:-------|
| `/login` | Inicio de sesión | pública |
| `/register` | Registro de la tripulación | pública |
| `/` | Dashboard con los indicadores y el Log Pose | privada |
| `/wanted` | Carteles de "Se Busca" | privada |
| `/wanted/:id` | Detalle de un cartel | privada |
| cualquier otra | Página 404 | — |

## Estado de los checkpoints

| Checkpoint | Estado |
|:-----------|:-------|
| CP1 — Zarpar | implementado |
| CP2 — Carteles de "Se Busca" | implementado |
| CP3 — Inspección del Log Pose | pendiente (presencial) |
| CP4 — News Coo | no implementado |
| CP5 — Poneglyph | no implementado |

Los endpoints del Grand Line responden `423 LOG_POSE_REQUIRED` hasta aprobar el
CP3; la app todavía no los consume.

## Estructura

```
src/
  api/
    client.ts        Única puerta a la API: URL base, token, errores, 401 global
    types.ts         Tipos tomados del contrato de Swagger
  auth/
    AuthContext.tsx  Sesión: login, registro, restauración y cierre
    RequireAuth.tsx  Rutas privadas y retorno a la ruta pedida
  components/
    Layout.tsx       Marco de la zona privada
    ui.tsx           Loading, error con reintento, vacío y campos de formulario
  pages/
    DashboardPage.tsx
    LoginPage.tsx
    RegisterPage.tsx
    WantedListPage.tsx    Listado: filtros, búsqueda, orden y paginación
    WantedDetailPage.tsx
    NotFoundPage.tsx
    wantedQuery.ts        Lectura y validación del estado desde la URL
    wantedCache.ts        Última página y scroll por combinación de filtros
```
