# Métricas de Línea Base

## 1. Métricas del Repositorio de Código

| Métrica | Valor Registrado | Evidencia / Fuente |
| :--- | :---: | :--- |
| **Archivos Fuente Totales (sin node_modules/.next)** | 2,439 | `repository-files.txt` |
| **Archivos Fuente TypeScript / TSX** | 89 | `find apps/web/src` |
| **Usos Explícitos de `any`** | 166 | `any-usages.txt` |
| **Invocaciones a `console.log/error`** | 64 | `console-usages.txt` |
| **Creaciones de Cliente Supabase (`createClient`/`getSupabaseAdmin`)** | 66 | `supabase-client-creations.txt` |
| **Variables de Entorno Referenciadas** | 4 | `env-reference.txt` |

---

## 2. Métricas de Supabase (Esquema Público)

| Métrica | Valor Registrado | Evidencia / Fuente |
| :--- | :---: | :--- |
| **Tablas Públicas** | 15 | `tables.csv` |
| **Vistas Públicas** | 1 | `views.csv` |
| **Funciones / RPCs** | 5 | `functions.csv` |
| **Políticas RLS Declaradas** | 4 | `rls-policies.csv` |
| **Funciones `SECURITY DEFINER`** | 5 | `functions.csv` |
| **Buckets de Storage Públicos** | 1 | `storage-buckets.csv` |

---

## 3. Tiempos de Ejecución y Build (Línea Base)

| Comando / Operación | Tiempo Medido | Resultado / Estado |
| :--- | :---: | :--- |
| `npm ci` (Instalación limpia) | 94.24s | Exitoso (exit code 0) |
| `npm run lint --workspace=apps/web` | 56.93s | Warning / Exit code 1 (Eslint deprecation warnings) |
| `npx next build` (en `apps/web`) | 26.9s | Exitoso (Compilado limpiamente en 26.9s) |
| Tamaños del Bundle `.next` | 0.82 MB | Tamaño total optimizado del build estático |
