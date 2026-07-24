# Registro de Deuda Técnica (Technical Debt Register)

## TD-001 — RPC `SECURITY DEFINER` ejecutables por `anon`
- **Severidad**: P0
- **Dominio**: Supabase / Seguridad
- **Evidencia**: `rpc_create_campaign` y `search_contacts` no restringen `EXECUTE ON FUNCTION` al rol `authenticated`.
- **Archivo/Tabla/Función**: `supabase/migrations/20260619000002_campaign_rpc.sql`, `20260619000005_search_contacts_rpc.sql`
- **Impacto actual**: Usuarios no autenticados podrían invocar RPCs administrativas.
- **Riesgo de no corregir**: Exposición de datos o creación no autorizada de recursos.
- **Solución propuesta**: Revocar permisos a `anon` e incluir `SET search_path = public`.
- **Etapa recomendada**: Etapa 02
- **Esfuerzo estimado**: S

---

## TD-002 — Referencia `extraneous` en `package-lock.json`
- **Severidad**: P2
- **Dominio**: Tooling / Repositorio
- **Evidencia**: `package-lock.json` contiene la clave `"apps/wa-service": { "extraneous": true }`.
- **Archivo/Tabla/Función**: `package-lock.json`
- **Impacto actual**: Descalce entre el árbol de archivos y el lockfile de dependencias.
- **Riesgo de no corregir**: Advertencias constantes durante `npm ci` e inconsistencias en CI.
- **Solución propuesta**: Regenerar/sanear el lockfile (`npm install`) tras autorización.
- **Etapa recomendada**: Etapa 02
- **Esfuerzo estimado**: S

---

## TD-003 — 166 usos explícitos de `any` en TypeScript
- **Severidad**: P2
- **Dominio**: Frontend / Backend
- **Evidencia**: Registrados en `docs/refactor/01-baseline/evidence/any-usages.txt`.
- **Archivo/Tabla/Función**: Múltiples componentes y API routes.
- **Impacto actual**: Pérdida de verificación estática de tipos en tiempo de compilación.
- **Riesgo de no corregir**: Errores runtime `TypeError: Cannot read properties of undefined`.
- **Solución propuesta**: Generar tipos automáticos con `supabase gen types typescript` y schemas Zod.
- **Etapa recomendada**: Etapa 03 / 04
- **Esfuerzo estimado**: L

---

## TD-004 — Invocaciones directas de Service Role en API Routes
- **Severidad**: P1
- **Dominio**: Backend / API
- **Evidencia**: `getSupabaseAdmin()` utilizado en 66 puntos del código fuente.
- **Archivo/Tabla/Función**: `apps/web/src/app/api/...`
- **Impacto actual**: Bypass total de RLS confiando únicamente en la lógica de aplicación.
- **Riesgo de no corregir**: Si una ruta omite el filtro de tenant, se permite acceso cruzado a datos.
- **Solución propuesta**: Restringir service-role únicamente a tareas administrativas del superadmin y workers.
- **Etapa recomendada**: Etapa 03
- **Esfuerzo estimado**: M

---

## TD-005 — Procesador de Colas Cron Monolítico en Serverless
- **Severidad**: P1
- **Dominio**: Procesamiento de Envíos / Infraestructura
- **Evidencia**: `/api/cron/process-queue/route.ts` (286 líneas) ejecuta loops activos en Vercel.
- **Archivo/Tabla/Función**: `apps/web/src/app/api/cron/process-queue/route.ts`
- **Impacto actual**: timeouts en Vercel y dependencia de un cron HTTP.
- **Riesgo de no corregir**: Cancelación abrupta de envíos masivos.
- **Solución propuesta**: Migrar el procesamiento de colas a un Daemon/Worker 24/7 en `servidor-julio`.
- **Etapa recomendada**: Etapa 05
- **Esfuerzo estimado**: L
