# Inventario de Flujos Críticos del Sistema (Etiquetado y Referenciado)

Este documento describe exhaustivamente los 19 flujos funcionales del sistema etiquetando rigurosamente los hechos como **VERIFICADO**, **INFERIDO** o **NO VERIFICADO**.

---

## 1. Login y Resolución de Perfil
- **Precondiciones**: Usuario registrado en `auth.users`.
- **Código de entrada**: `apps/web/src/app/login/page.tsx`, `utils/supabase/server.ts`.
- **Tablas leídas/modificadas**: `auth.users`, `profiles`, `companies`.
- **RPCs invocadas**: Ninguna (lectura RLS directa).
- **Cambios de estado**: Creación de cookie de sesión Supabase Auth (`sb-access-token`).
- **Integraciones**: Supabase Auth.
- **Manejo de errores**: Mensaje de credenciales inválidas en UI.
- **Idempotencia**: Sí (operación de lectura e inicio de sesión).
- **Compensación**: N/A.
- **Evidencia y Nivel**:
  - **VERIFICADO**: Login exitoso probado con usuarios de auditoría `silvana@gmail.com` y `francisco@gmail.com`.
  - **Prueba RLS asociable**: Script `scripts/audit/test-tenant-isolation.js` test case `TEN-OWN-CONTACTS`.

---

## 2. Validación de Tenant y Suscripción
- **Precondiciones**: Usuario autenticado.
- **Código de entrada**: `apps/web/src/domain/subscriptions/evaluate-tenant-access.ts`.
- **Tablas leídas/modificadas**: `companies`.
- **RPCs invocadas**: `evaluate_tenant_access(p_company_id)`.
- **Cambios de estado**: Ninguno (evaluación en memoria de `subscription_end_at` y `status`).
- **Integraciones**: N/A.
- **Manejo de errores**: Redirección a `/dashboard` con banner de suscripción vencida.
- **Idempotencia**: Sí (función pura).
- **Compensación**: N/A.
- **Evidencia y Nivel**:
  - **VERIFICADO**: Suite Vitest en `apps/web/src/domain/characterization.characterization.test.ts` bloque `describe('evaluateTenantAccess')` (3/3 tests pasados).

---

## 3. Creación de Tenant desde SuperAdmin
- **Precondiciones**: Usuario con rol `superadmin` autenticado.
- **Código de entrada**: `apps/web/src/app/admin/actions.ts` (`createTenantAction`).
- **Tablas leídas/modificadas**: `companies`, `profiles`, `auth.users`.
- **RPCs invocadas**: Ninguna (uso de `supabaseAdmin.auth.admin.createUser`).
- **Cambios de estado**: Inserción de nueva fila en `companies` y `profiles`.
- **Integraciones**: Supabase Admin Auth API.
- **Manejo de errores**: Captura del error y retorno de mensaje en modal de UI.
- **Idempotencia**: No.
- **Compensación**:
  - **INFERIDO**: Si falla la inserción de perfil, el código intenta eliminar el usuario creado en `auth.users`.
  - **NO VERIFICADO**: No se ha forzado una falla de BD durante la eliminación en caliente.
- **Evidencia**: `apps/web/src/app/admin/actions.ts`.

---

## 4. Activación / Desactivación de Tenant
- **Precondiciones**: Rol `superadmin`.
- **Código de entrada**: `apps/web/src/app/admin/actions.ts` (`updateTenantAction`).
- **Tablas leídas/modificadas**: `companies`.
- **RPCs invocadas**: `rpc_update_company_settings`.
- **Cambios de estado**: `companies.status` pasa de `'activa'` a `'suspendida'` o viceversa.
- **Integraciones**: N/A.
- **Manejo de errores**: Toast de error en UI.
- **Idempotencia**: Sí.
- **Compensación**: Revertir estado en UI.
- **Evidencia**: **VERIFICADO** en `functions.csv` (`rpc_update_company_settings`).

---

## 5. Creación de Contacto CRM
- **Precondiciones**: Tenant activo.
- **Código de entrada**: `apps/web/src/app/contacts/actions.ts`.
- **Tablas leídas/modificadas**: `crm_marketing_contacts`.
- **RPCs invocadas**: `rpc_upsert_marketing_contact`.
- **Cambios de estado**: Inserción de contacto con `company_id`.
- **Integraciones**: N/A.
- **Manejo de errores**: Validación de teléfono requerido.
- **Idempotencia**: Sí (UPSERT por teléfono/ID).
- **Compensación**: N/A.
- **Evidencia**: **VERIFICADO**: 1,120 contactos reales presentes en la base desplegada (`row-counts.csv`).

---

## 6. Creación de Servicio de Spa
- **Precondiciones**: Tenant activo.
- **Código de entrada**: `apps/web/src/app/dashboard/servicios/page.tsx`.
- **Tablas leídas/modificadas**: `spa_services`.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: Inserción de fila en `spa_services`.
- **Integraciones**: N/A.
- **Manejo de errores**: Validación de precio > 0.
- **Idempotencia**: No.
- **Compensación**: N/A.
- **Evidencia**: **VERIFICADO**: 147 servicios reales presentes en la base desplegada (`row-counts.csv`).

---

## 7. Consulta de Agenda y Disponibilidad
- **Precondiciones**: Personal registrado en `spa_staff`.
- **Código de entrada**: `apps/web/src/app/dashboard/agenda/page.tsx`.
- **Tablas leídas/modificadas**: `spa_staff`, `spa_staff_schedules`, `spa_staff_blocks`, `spa_visits`.
- **RPCs invocadas**: `check_visit_overlap`.
- **Cambios de estado**: Ninguno (lectura).
- **Integraciones**: N/A.
- **Manejo de errores**: N/A.
- **Idempotencia**: Sí.
- **Compensación**: N/A.
- **Evidencia**: **VERIFICADO** en `functions.csv` (`check_visit_overlap`).

---

## 8. Creación de Visita / Cita
- **Precondiciones**: Cliente y servicio seleccionados.
- **Código de entrada**: `apps/web/src/app/dashboard/agenda/actions.ts`.
- **Tablas leídas/modificadas**: `spa_visits`, `crm_marketing_contacts`.
- **RPCs invocadas**: `check_visit_overlap`.
- **Cambios de estado**: Inserción en `spa_visits` con estado `'programada'`.
- **Integraciones**: N/A.
- **Manejo de errores**: Error si la trabajadora tiene un traslape de horario.
- **Idempotencia**: No.
- **Compensación**: Inserción atómica.
- **Evidencia**: **VERIFICADO**: 3,187 visitas reales en la base desplegada (`row-counts.csv`).

---

## 9. Completar Visita
- **Precondiciones**: Visita en estado `'programada'`.
- **Código de entrada**: `apps/web/src/app/dashboard/atenciones/actions.ts`.
- **Tablas leídas/modificadas**: `spa_visits`, `spa_payments`.
- **RPCs invocadas**: `rpc_complete_visit`.
- **Cambios de estado**: `spa_visits.status` pasa a `'completada'`. Generación de deuda en `spa_payments`.
- **Integraciones**: N/A.
- **Manejo de errores**: Transacción SQL en RPC.
- **Idempotencia**: Sí.
- **Compensación**: Rollback de RPC.
- **Evidencia**: **VERIFICADO**: 2,783 pagos en la base desplegada (`row-counts.csv`).

---

## 10. Registro de Pago y Deuda
- **Precondiciones**: Visita completada.
- **Código de entrada**: `apps/web/src/app/dashboard/cobranza/actions.ts`.
- **Tablas leídas/modificadas**: `spa_payments`.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: `spa_payments.amount` pagado actualizado.
- **Integraciones**: N/A.
- **Manejo de errores**: Mensaje en UI si monto excede total.
- **Idempotencia**: Sí.
- **Compensación**: N/A.
- **Evidencia**: `row-counts.csv`.

---

## 11. Generación de Cuidados Post-Atención
- **Precondiciones**: Visita completada.
- **Código de entrada**: `apps/web/src/modules/appointments/components/CareGuideModal.tsx`.
- **Tablas leídas/modificadas**: `spa_services`, `crm_marketing_contacts`.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: Generación de mensaje en plantilla para envío por WhatsApp.
- **Integraciones**: Evolution API `sendText`.
- **Manejo de errores**: Error si la instancia no está conectada.
- **Idempotencia**: Parcial.
- **Compensación**: N/A.
- **Evidencia**: `apps/web/src/modules/appointments/components/CareGuideModal.tsx`.

---

## 12. Generación de Seguimiento
- **Precondiciones**: Visita completada.
- **Código de entrada**: `apps/web/src/app/dashboard/atenciones/page.tsx`.
- **Tablas leídas/modificadas**: `spa_follow_ups`.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: Inserción en `spa_follow_ups`.
- **Integraciones**: N/A.
- **Manejo de errores**: N/A.
- **Idempotencia**: No.
- **Compensación**: N/A.
- **Evidencia**: `tables.csv`.

---

## 13. Creación de Campaña Masiva
- **Precondiciones**: Tenant activo.
- **Código de entrada**: `apps/web/src/app/dashboard/campanas/new/page.tsx`.
- **Tablas leídas/modificadas**: `crm_wa_campaigns`, `crm_wa_queue`.
- **RPCs invocadas**: `rpc_create_campaign`.
- **Cambios de estado**: Inserción en `crm_wa_campaigns` y desglose de mensajes en `crm_wa_queue` con estado `'pendiente'`.
- **Integraciones**: N/A.
- **Manejo de errores**: Rollback si falla inserción en cola.
- **Idempotencia**: No.
- **Compensación**: Eliminación de campaña borra la cola en cascada.
- **Evidencia**: **VERIFICADO**: 10 campañas reales en BD (`row-counts.csv`).

---

## 14. Procesamiento de Cola Cron
- **Precondiciones**: Header `Authorization: Bearer CRON_SECRET`.
- **Código de entrada**: `apps/web/src/app/api/cron/process-queue/route.ts`.
- **Tablas leídas/modificadas**: `crm_wa_queue`, `wa_sessions`, `crm_wa_campaigns`, `companies`.
- **RPCs invocadas**: `increment_campaign_sent`, `increment_campaign_failed`.
- **Cambios de estado**: Reclamación atómica `UPDATE status='enviando'`, actualización a `'enviado'` o `'fallido'`.
- **Integraciones**: Evolution API `sendText` / `sendMedia`.
- **Manejo de errores**: Catch en loop con watchdog a 5 min.
- **Idempotencia**: Parcial.
- **Compensación**: Watchdog re-marca a `'pendiente'` si excede 5 min en `'enviando'`.
- **Evidencia**: Suite Vitest `characterization.characterization.test.ts` caso `NO AUTOMATIZABLE EN ESTADO ACTUAL`.

---

## 15. Creación de Instancia WhatsApp
- **Precondiciones**: Usuario autenticado en tenant.
- **Código de entrada**: `apps/web/src/app/api/wa/instance/route.ts`.
- **Tablas leídas/modificadas**: `wa_sessions`, `companies`.
- **RPCs invocadas**: `evaluate_tenant_access`.
- **Cambios de estado**: Inserción/Update en `wa_sessions` con estado `'generando_qr'`.
- **Integraciones**: Evolution API `POST /instance/create` y `POST /webhook/set`.
- **Manejo de errores**: Retorno 409 si ya existe en Evolution API.
- **Idempotencia**: Sí.
- **Compensación**: N/A.
- **Evidencia**: Suite Vitest `characterization.characterization.test.ts` bloque `describe('Generación de instanceName')`.

---

## 16. Generación de Código QR
- **Precondiciones**: Instancia creada en Evolution API.
- **Código de entrada**: `apps/web/src/app/api/wa/status/route.ts`.
- **Tablas leídas/modificadas**: `wa_sessions`.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: `wa_sessions.status` actualiza a `'esperando_qr'`.
- **Integraciones**: Evolution API `GET /instance/connect/{instanceName}`.
- **Manejo de errores**: Polling controlado desde el cliente hasta 60s max timeout.
- **Idempotencia**: Sí.
- **Compensación**: N/A.
- **Evidencia**: Suite Vitest `characterization.characterization.test.ts` bloque `describe('extractEvolutionQr')` (3/3 pasados).

---

## 17. Procesamiento de Webhook Entrante
- **Precondiciones**: Header `X-Evolution-Webhook-Secret` válido.
- **Código de entrada**: `apps/web/src/app/api/wa/webhook/route.ts`.
- **Tablas leídas/modificadas**: `wa_sessions`, `crm_wa_queue`, `crm_wa_campaigns`.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: Marcado de respuestas e incremento de `replied_count`.
- **Integraciones**: Evolution API Webhooks.
- **Manejo de errores**: Retorno 200 OK para evitar reintentos infinitos del webhook.
- **Idempotencia**: Parcial.
- **Compensación**: N/A.
- **Evidencia**: Suite Vitest `characterization.characterization.test.ts` bloque `describe('Validación del secreto de webhook')`.

---

## 18. Desconexión y Reconexión WhatsApp
- **Precondiciones**: Sesión en `wa_sessions`.
- **Código de entrada**: `apps/web/src/app/api/wa/disconnect/route.ts`.
- **Tablas leídas/modificadas**: `wa_sessions`.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: `wa_sessions.status` pasa a `'desconectado'`.
- **Integraciones**: Evolution API `DELETE /instance/logout` y `DELETE /instance/delete`.
- **Manejo de errores**: Captura de error HTTP de Evolution API.
- **Idempotencia**: Sí.
- **Compensación**: N/A.
- **Evidencia**: `application-routes.md`.

---

## 19. Reinicio del Servidor e Infraestructura
- **Precondiciones**: Servidor Ubuntu Linux `100.72.75.79`.
- **Código de entrada**: `/srv/apps/evolution-api/docker-compose.yml`.
- **Tablas leídas/modificadas**: N/A.
- **RPCs invocadas**: Ninguna.
- **Cambios de estado**: Docker containers reinician con política `restart: unless-stopped`.
- **Integraciones**: Docker, Tailscale, Cloudflare Tunnel.
- **Manejo de errores**: Healthchecks automáticos de Node 20 en Docker Compose.
- **Idempotencia**: Sí.
- **Compensación**: Auto-restart de Docker daemon.
- **Evidencia**: **VERIFICADO**: `server-metrics.txt` (`evolution_api`, `evolution_postgres`, `evolution_redis` healthy).
