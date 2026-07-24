# Inventario de Variables de Entorno

## 1. Matriz de Variables de Entorno Identificadas

| Variable | Ambiente | Obligatoria | Secreto | Consumidor | Riesgo / Observación |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `EVOLUTION_API_URL` | Server | Sí | No | `src/config/env.ts`, `evolution/client.ts` | URL base de Evolution API v2.2.3. |
| `EVOLUTION_API_KEY` | Server | Sí | Sí | `src/config/env.ts`, `evolution/client.ts` | Clave API de administración de Evolution API. |
| `INTERNAL_TOKEN` | Server | Sí | Sí | `src/config/env.ts`, `webhook/route.ts` | Secreto de validación para llamadas webhook. |
| `APP_PUBLIC_URL` | Server | Sí | No | `src/config/env.ts`, `instance/route.ts` | URL pública canónica para registrar el webhook. |
| `CF_ACCESS_CLIENT_ID` | Server | No | Sí | `evolution/client.ts` | Credencial Service Auth para Cloudflare Access. |
| `CF_ACCESS_CLIENT_SECRET` | Server | No | Sí | `evolution/client.ts` | Credencial Service Auth para Cloudflare Access. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/Server | Sí | No | `utils/supabase/client.ts`, `server.ts` | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/Server | Sí | No | `utils/supabase/client.ts` | Clave anónima pública de Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Sí | Sí | `utils/supabase/admin.ts` | Clave de administrador service-role bypass RLS. |
| `CRON_SECRET` | Server | Sí | Sí | `api/cron/process-queue/route.ts` | Token Bearer para autenticar Vercel Cron. |

---

## 2. Inconsistencias de Configuración Registradas

* En `src/config/env.ts`, `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` fueron marcadas como `.optional()`, lo cual puede provocar fallos silenciosos en caso de faltar en el entorno.
