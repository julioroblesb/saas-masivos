# Auditoría de Seguridad y RLS en Supabase

## 1. Matriz de Hallazgos y Avisos de Seguridad

| Objeto | Riesgo / Aviso | Severidad | Roles Afectados | Posible Explotación | Remediación Propuesta | Etapa |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `v_active_tenants` | Security Definer View | P1 | `anon`, `authenticated` | Permite consultar empresas sin pasar por aislamiento RLS estricto de `company_id`. | Convertir en vista normal o restringir RLS. | Etapa 02 |
| `search_contacts` | Function Search Path Mutable | P1 | `anon` | Hijacking de esquema al buscar tipos en path no calificado. | Añadir `SET search_path = public` explícito. | Etapa 02 |
| `rpc_create_campaign` | Public Execute SECURITY DEFINER | P0 | `anon` | Ejecución anónima de creación de campañas sin validación de usuario. | Revocar `EXECUTE ON FUNCTION` a `anon`. | Etapa 02 |
| `campaign-media` | Public Bucket Allows Listing | P2 | `public` | Listado masivo de archivos adjuntos cargados por otros tenants. | Desactivar listado público y forzar paths por `company_id`. | Etapa 02 |
| `auth.users` | Leaked Password Protection Disabled | P2 | `auth` | Vulnerabilidad ante contraseñas comprometidas conocidas. | Habilitar HaveIBeenPwned check en Supabase Auth settings. | Etapa 02 |
| `crm_wa_queue` | Unindexed Foreign Key | P2 | DB Performance | Degradación de consultas JOIN al eliminar o buscar por `campaign_id`. | Crear índice `CREATE INDEX ON crm_wa_queue(campaign_id)`. | Etapa 02 |

---

## 2. Matriz de Resultados de Aislamiento Multi-Tenant

| Caso de Prueba | Usuario / Rol Ejecutor | Acción / Endpoint Probado | Resultado HTTP | Filas Devueltas | Resultado Esperado | Resultado Real |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **TEN-001** | Tenant A Authenticated | `SELECT * FROM crm_marketing_contacts` | 200 OK | Contactos Tenant A | Solo filas del Tenant A | Aislamiento Correcto |
| **TEN-002** | Tenant A Authenticated | `SELECT * FROM crm_marketing_contacts WHERE company_id = Tenant_B` | 200 OK | 0 filas devueltas | 0 filas (bloqueado por RLS) | Aislamiento Correcto |
| **TEN-003** | Tenant A Authenticated | `SELECT * FROM spa_visits WHERE company_id = Tenant_B` | 200 OK | 0 filas devueltas | 0 filas | Aislamiento Correcto |
| **TEN-004** | Tenant A Authenticated | `SELECT * FROM spa_payments WHERE company_id = Tenant_B` | 200 OK | 0 filas devueltas | 0 filas | Aislamiento Correcto |
| **TEN-005** | Tenant A Authenticated | `SELECT * FROM crm_wa_campaigns WHERE company_id = Tenant_B` | 200 OK | 0 filas devueltas | 0 filas | Aislamiento Correcto |
| **TEN-006** | Tenant A Authenticated | `SELECT * FROM wa_sessions WHERE company_id = Tenant_B` | 200 OK | 0 filas devueltas | 0 filas | Aislamiento Correcto |
| **TEN-007** | Tenant A Authenticated | `UPDATE crm_marketing_contacts SET first_name='Hacked' WHERE company_id=Tenant_B` | 200 OK | 0 filas afectadas | 0 filas modificadas | Aislamiento Correcto |
| **TEN-008** | Usuario Anónimo (`anon`) | `SELECT * FROM crm_marketing_contacts` | 200 OK | 0 filas devueltas | 0 filas (requiere auth) | Aislamiento Correcto |
| **TEN-009** | Anon via `search_contacts` | `SELECT * FROM search_contacts('test')` | 200 OK | Filas según RPC | Bloqueo o filtrado por auth | **P0: RPC ejecuta como DEFINER sin auth check** |
| **TEN-010** | Tenant sin `company_id` | `SELECT * FROM crm_marketing_contacts` | 200 OK | 0 filas devueltas | 0 filas | Aislamiento Correcto |
