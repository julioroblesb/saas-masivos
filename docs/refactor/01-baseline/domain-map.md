# Mapa de Dominios y Responsabilidades

## 1. Clasificación de Dominios del Sistema

### 1. Autenticación y Perfiles

- **Frontend**: `/login`, `/dashboard`, `Header.tsx`.
- **Backend**: `/utils/supabase/server.ts`, `/utils/supabase/client.ts`, `/utils/supabase/admin.ts`.
- **BD / RPC**: `profiles`, `auth.users`, `handle_new_user()`.
- **Acoplamientos**: `profiles.company_id` vincula al usuario autenticado con su tenant.

### 2. Gestión de Tenants y Suscripciones

- **Frontend**: `/admin` (SuperAdmin), `EditTenantModal.tsx`, `CreateTenantForm.tsx`, `TenantTable.tsx`.
- **Backend**: `/admin/actions.ts`, `/domain/subscriptions/evaluate-tenant-access.ts`.
- **BD / RPC**: `companies`, `evaluateTenantAccess`.
- **Reglas**: Evaluación de acceso por fecha `subscription_end_at` y `status`.

### 3. CRM de Contactos y Marketing

- **Frontend**: `/contacts`, `/contacts/[id]`.
- **BD / RPC**: `crm_marketing_contacts`, `rpc_upsert_marketing_contact`, `search_contacts`.

### 4. Campañas Masivas y Cola de Envíos

- **Frontend**: `/campaigns`, `/campaigns/new`, `/campaigns/[id]`.
- **Backend**: `/api/cron/process-queue`, `shared/utils/spintax.ts`.
- **BD / RPC**: `crm_wa_campaigns`, `crm_wa_queue`, `increment_campaign_sent`, `increment_campaign_failed`.

### 5. Integración WhatsApp (Baileys / Evolution API)

- **Frontend**: `WhatsappConnection.tsx`.
- **Backend**: `/api/wa/instance`, `/api/wa/status`, `/api/wa/disconnect`, `/api/wa/webhook`, `src/integrations/evolution/client.ts`.
- **BD / RPC**: `wa_sessions`, `wa_auth_state`.

### 6. Gestión de Salón / Agenda y Servicios

- **Frontend**: `/appointments`, `/services`, `/staff`.
- **BD / RPC**: `spa_services`, `spa_staff`, `spa_staff_services`, `spa_staff_schedules`, `spa_visits`, `spa_payments`, `spa_follow_ups`.

---

## 2. Reglas de Negocio Duplicadas Detectadas

1. **Verificación de Suscripción**: Duplicada entre `instance/route.ts`, `status/route.ts`, `process-queue/route.ts` y `admin/page.tsx` (ahora parcialmente unificada con `evaluateTenantAccess`).
2. **Normalización de Teléfonos**: Se limpia el número en `process-queue/route.ts`, `webhook/route.ts` y `CreateTenantForm.tsx` mediante regex independientes `replace(/[^0-9]/g, '')`.
3. **Formateo de Fechas de Vencimiento**: Lógica duplicada entre `EditTenantModal.tsx` y `TenantTable.tsx`.
