# Inventario de Rutas y Superficie HTTP

## 1. Inventario Completo de API Routes (`apps/web/src/app/api`)

| Método | Ruta                      | Autenticación  | Autorización Tenant / Rol    | Cliente Supabase              | Tablas / RPC Usadas                                            | Servicio Externo | Input                  | Validación          | Output                                 | Efectos Secundarios                         | Idempotencia | Riesgos                                         |
| :----- | :------------------------ | :------------- | :--------------------------- | :---------------------------- | :------------------------------------------------------------- | :--------------- | :--------------------- | :------------------ | :------------------------------------- | :------------------------------------------ | :----------- | :---------------------------------------------- |
| `POST` | `/api/wa/instance`        | Cookie Usuario | `evaluateTenantAccess`       | `createClient` + Service Role | `profiles`, `companies`, `wa_sessions`                         | Evolution API    | Header `Host`          | Manual + Zod env    | JSON `{ instanceName, status, qr }`    | Crea instancia en Evolution, guarda webhook | No           | Error 409 ignorado intencionalmente al existir  |
| `GET`  | `/api/wa/status`          | Cookie Usuario | `evaluateTenantAccess`       | `createClient` + Service Role | `profiles`, `companies`, `wa_sessions`                         | Evolution API    | Ninguno                | Manual              | JSON `{ status, evo_state, code, qr }` | Actualiza `wa_sessions.status`              | Sí           | Polling frecuente desde navegador               |
| `POST` | `/api/wa/disconnect`      | Cookie Usuario | User auth check              | `createClient` + Service Role | `profiles`, `wa_sessions`                                      | Evolution API    | Ninguno                | Manual              | JSON `{ message }`                     | Resetea `wa_sessions`, borra en Evolution   | No           | Reducción de sesión en BD                       |
| `POST` | `/api/wa/webhook`         | Header Secret  | `X-Evolution-Webhook-Secret` | Service Role                  | `wa_sessions`, `crm_wa_queue`, `crm_wa_campaigns`              | Ninguno          | JSON Body Payload      | Header Secret Match | JSON `{ success: true }`               | Incrementa `replied_count`, marca `replied` | Parcial      | No guarda `external_event_id` contra duplicados |
| `GET`  | `/api/cron/process-queue` | Header Bearer  | `CRON_SECRET` match          | Service Role                  | `wa_sessions`, `crm_wa_queue`, `crm_wa_campaigns`, `companies` | Evolution API    | Header `Authorization` | Manual              | JSON `{ summary }`                     | Envía WA, incrementa contadores             | Parcial      | Timeout si Vercel sobrepasa 45s                 |
| `GET`  | `/api/cron/cleanup-queue` | Header Bearer  | `CRON_SECRET` match          | Service Role                  | `crm_wa_queue`                                                 | Ninguno          | Header `Authorization` | Manual              | JSON `{ cleaned }`                     | Elimina ítems antiguos enviados             | Sí           | Borrado permanente de cola antigua              |

---

## 2. Hallazgos en la Superficie HTTP

1. **Rutas >150 Líneas**: `/api/cron/process-queue/route.ts` (286 líneas) concentra lógica de watchdog, selección, sleep/jitter y llamadas a la API de WhatsApp.
2. **Dependencia de Service Role**: Prácticamente todas las API routes requieren `SUPABASE_SERVICE_ROLE_KEY` para saltar RLS al operar sobre `wa_sessions` y `crm_wa_queue`.
3. **Validación de Parámetros**: `/api/wa/webhook` confía en el campo `body.instance` para determinar la sesión de WhatsApp del tenant.
