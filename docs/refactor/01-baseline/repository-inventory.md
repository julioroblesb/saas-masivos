# Inventario del Repositorio y Métricas de Código (Fuente Autoritativa: git ls-files)

## 1. Métricas de Archivos Versionados

| Categoría                                         | Cantidad de Archivos | Descripción                                                          |
| :------------------------------------------------ | :------------------: | :------------------------------------------------------------------- |
| **Archivos Versionados Totales (`git ls-files`)** |       **896**        | Total de archivos rastreados por Git en la rama actual.              |
| **Archivos Fuente Reales de Aplicación**          |       **325**        | Código fuente activo de aplicación (`src`, `migrations`, `scripts`). |
| - _Frontend TypeScript / TSX (`apps/web/src`)_    |         292          | Componentes, páginas, hooks, dominio e integraciones.                |
| - _Migraciones SQL (`supabase/migrations`)_       |          32          | Archivos de migraciones históricas en el repositorio.                |
| - _Scripts de Automatización (`scripts/`)_        |          1           | Runner de auditorías de aislamiento multi-tenant.                    |
| **Documentación (`docs/`)**                       |          35          | Documentos de arquitectura e inventarios de refactorización.         |
| **Configuración del Proyecto**                    |          4           | `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`.  |

_(Nota: Los directorios de tooling de agentes como `.gemini` y dependencias `node_modules` son excluidos estrictamente del conteo de código fuente del SaaS)._

---

## 2. Diagnóstico de Workspaces y Lockfile

- **Entorno Runtime**: Node.js `v22.11.0`, npm `10.9.0`.
- **Workspace Raíz**: Declara `apps/*`.
- **Inconsistencia Registrada**: `package-lock.json` conserva una entrada `extraneous` correspondiente al módulo legacy `apps/wa-service`.
