# Auditoría de Seguridad y RLS en Supabase (Evidencias de la Base Real)

## 1. Auditoría Ejecutable de Aislamiento Multi-Tenant (`scripts/audit/test-tenant-isolation.mjs`)

Los siguientes resultados fueron generados ejecutando peticiones HTTP reales contra `https://ywpafptrcvgoyaoqgzkz.supabase.co` comparando Tenant A (`silvana@gmail.com`) y Tenant B (`francisco@gmail.com`). Evidencia guardada en `docs/refactor/01-baseline/evidence/rls-test-results.json`.

| ID | Actor | Recurso / Operación | Status HTTP | Filas Devueltas | Comportamiento Esperado | Resultado |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| **ANON-001** | `anon` | `SELECT companies` | 200 | 0 | Acceso denegado o 0 filas | PASS |
| **ANON-002** | `anon` | `SELECT profiles` | 200 | 0 | Acceso denegado o 0 filas | PASS |
| **ANON-003** | `anon` | `SELECT crm_marketing_contacts` | 200 | 0 | Acceso denegado o 0 filas | PASS |
| **ANON-004** | `anon` | `SELECT spa_visits` | 200 | 0 | Acceso denegado o 0 filas | PASS |
| **ANON-005** | `anon` | `SELECT spa_payments` | 200 | 0 | Acceso denegado o 0 filas | PASS |
| **ANON-006** | `anon` | `SELECT crm_wa_campaigns` | 200 | 0 | Acceso denegado o 0 filas | PASS |
| **ANON-007** | `anon` | `SELECT wa_sessions` | 200 | 0 | Acceso denegado o 0 filas | PASS |
| **ANON-RPC-001** | `anon` | `RPC search_contacts` | 404 | 0 | Denegar ejecución a anon | PASS (404/Block) |
| **TEN-001** | `tenant_a` | `SELECT own crm_marketing_contacts` | 200 | 122 | Retorna solo filas de Tenant A | PASS |
| **TEN-002** | `tenant_a` | `SELECT cross crm_marketing_contacts` | 200 | 0 | Bloqueado por RLS | PASS |
| **TEN-003** | `tenant_a` | `SELECT cross spa_visits` | 200 | 0 | Bloqueado por RLS | PASS |
| **TEN-004** | `tenant_a` | `SELECT cross spa_payments` | 200 | 0 | Bloqueado por RLS | PASS |
| **TEN-005** | `tenant_a` | `SELECT cross crm_wa_campaigns` | 200 | 0 | Bloqueado por RLS | PASS |
| **TEN-006** | `tenant_a` | `SELECT cross wa_sessions` | 200 | 0 | Bloqueado por RLS | PASS |
| **TEN-007** | `tenant_a` | `UPDATE cross crm_marketing_contacts` | 400 | 0 | Bloqueado por RLS | PASS |

---

## 2. Hallazgos de Advisors de Seguridad y Rendimiento

1. **Security Definer View**: `view_crm_profiles` expone datos de clientes mediante privilegios de definidor.
2. **Funciones SECURITY DEFINER ejecutables por `anon`**: RPCs como `rpc_create_campaign` no restringen `EXECUTE ON FUNCTION` al rol `authenticated`.
3. **Search Path Mutable**: Las 20 funciones `SECURITY DEFINER` omiten `SET search_path = public`, exponiendo vulnerabilidades de hijacking de esquema.
4. **Políticas Asignadas a `public`**: Múltiples tablas públicas asignan políticas al rol `public` en vez de `authenticated`.
5. **Bucket Público Listable**: El bucket `spa-media` permite listado público sin verificación por tenant.
6. **Foreign Keys sin Índice**: `crm_wa_queue.campaign_id`, `spa_visits.staff_id`.
7. **Protección de Contraseñas Filtradas Desactivada**: Configuración por defecto en Auth Settings.
