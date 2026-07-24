# Matriz de Pruebas y Caracterización

## Matriz de Cobertura de Casos de Caracterización

| ID | Dominio | Caso de Prueba | Tipo de Prueba | Automatizado | Estado Actual | Evidencia / Referencia |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **AUTH-001** | Autenticación | Login de usuario tenant válido | Manual E2E | No | PASS | Inicio de sesión redirige a `/dashboard`. |
| **AUTH-002** | Autenticación | Login de SuperAdmin | Manual E2E | No | PASS | Redirige a `/admin`. |
| **TEN-001** | Tenant / RLS | Aislamiento de contactos (Tenant A no ve B) | Integración BD | Sí | PASS | `docs/refactor/01-baseline/supabase-security.md` |
| **TEN-002** | Tenant / RLS | Aislamiento de visitas (Tenant A no ve B) | Integración BD | Sí | PASS | `docs/refactor/01-baseline/supabase-security.md` |
| **TEN-003** | Tenant / RLS | Aislamiento de pagos (Tenant A no ve B) | Integración BD | Sí | PASS | `docs/refactor/01-baseline/supabase-security.md` |
| **SUB-001** | Suscripciones | Evaluación de tenant activo con fecha futura | Dominio Unit | Sí | PASS | `evaluateTenantAccess` allowed = true |
| **SUB-002** | Suscripciones | Evaluación de tenant con fecha vencida | Dominio Unit | Sí | PASS | `evaluateTenantAccess` allowed = false (reason = expired) |
| **SUB-003** | Suscripciones | Evaluación de tenant suspendido | Dominio Unit | Sí | PASS | `evaluateTenantAccess` allowed = false (reason = suspended) |
| **WA-001** | WhatsApp | Generación de nombre inmutable `company_<UUID>` | Integración API | Sí | PASS | `instance/route.ts` conserva UUID sin guiones |
| **WA-002** | WhatsApp | Estado `generando_qr` vs `esperando_qr` | Integración API | Sí | PASS | `status/route.ts` separa según disponibilidad de QR |
| **WA-003** | WhatsApp | Polling controlado a 60s max timeout | Frontend Unit | Sí | PASS | `WhatsappConnection.tsx` detiene polling a 20 intentos |
| **CRON-001**| Cola Cron | Reclamación atómica de mensajes pendientes | Integración BD | Sí | PASS | `process-queue/route.ts` actualiza a `enviando` |
