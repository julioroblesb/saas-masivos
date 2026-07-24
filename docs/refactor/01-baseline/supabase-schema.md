# Inventario del Esquema de Supabase (Extracción en Vivo `ywpafptrcvgoyaoqgzkz`)

Este documento refleja la estructura real y volumen de datos extraídos directamente de la base de datos PostgreSQL desplegada en Supabase al **2026-07-24T11:00:00Z**.

---

## 1. Resumen de Objetos en Vivo

- **Tablas Públicas**: 16 tablas.
- **Vistas Públicas**: 1 vista (`view_crm_profiles`).
- **Funciones Públicas**: 25 funciones.
- **Funciones SECURITY DEFINER**: 20 funciones.
- **Políticas RLS**: 38 políticas activas.
- **Storage Bucket**: 1 bucket (`spa-media`, Público).

---

## 2. Conteo de Filas Reales por Tabla (`row-counts.csv`)

| Tabla | Registros Reales | Función Principal |
| :--- | :---: | :--- |
| `spa_visits` | **3,187** | Historial de citas y atenciones agendadas. |
| `spa_payments` | **2,783** | Registro de cobranzas y pagos recibidos. |
| `crm_marketing_contacts` | **1,120** | Base de clientes y contactos CRM del tenant. |
| `spa_staff_services` | **432** | Asociación de personal con servicios prestados. |
| `spa_services` | **147** | Catálogo de servicios de belleza y spa. |
| `spa_staff_schedules` | **112** | Horarios semanales del personal. |
| `spa_products` | **91** | Catálogo de productos de belleza del salón. |
| `spa_staff` | **51** | Personal registrado. |
| `crm_wa_queue` | **41** | Cola de mensajes de WhatsApp pendientes/enviados. |
| `profiles` | **19** | Usuarios/perfiles registrados. |
| `companies` | **18** | Tenants/empresas registradas en la plataforma. |
| `wa_sessions` | **18** | Sesiones de WhatsApp por tenant. |
| `crm_wa_campaigns` | **10** | Campañas de envío masivo creadas. |
| `wa_auth_state` | **0** | Persistencia legacy de Baileys (inactiva). |
| `spa_staff_blocks` | **0** | Bloqueos temporales de agenda. |
| `spa_follow_ups` | **0** | Seguimientos post-atención. |

---

## 3. Inventario Completo de Funciones Públicas (25 Funciones)

| Nombre de Función | Firma de Argumentos | Tipo Retorno | SEC. DEFINER | Search Path |
| :--- | :--- | :--- | :---: | :---: |
| `auth_company_id` | `()` | `uuid` | YES | NO |
| `current_tenant_id` | `()` | `uuid` | YES | NO |
| `check_visit_overlap` | `(p_staff_id uuid, p_start timestamptz, p_end timestamptz)` | `boolean` | YES | NO |
| `evaluate_tenant_access` | `(p_company_id uuid)` | `jsonb` | YES | NO |
| `increment_campaign_sent` | `(p_campaign_id uuid)` | `void` | YES | NO |
| `increment_campaign_failed` | `(p_campaign_id uuid)` | `void` | YES | NO |
| `rpc_archive_contacts` | `(p_contact_ids uuid[])` | `jsonb` | YES | NO |
| `rpc_batch_insert_marketing_contacts` | `(p_contacts jsonb)` | `jsonb` | YES | NO |
| `rpc_cancel_campaign` | `(p_campaign_id uuid)` | `jsonb` | YES | NO |
| `rpc_cleanup_demo_companies` | `()` | `jsonb` | YES | NO |
| `rpc_clone_demo_company` | `(p_new_name text)` | `jsonb` | YES | NO |
| `rpc_complete_visit` | `(p_visit_id uuid)` | `jsonb` | YES | NO |
| `rpc_count_contacts_by_tag` | `(p_tag text)` | `jsonb` | YES | NO |
| `rpc_create_campaign` | `(p_name text, p_message text)` | `jsonb` | YES | NO |
| `rpc_delete_marketing_contact` | `(p_contact_id uuid)` | `jsonb` | YES | NO |
| `rpc_delete_marketing_contacts_by_tag` | `(p_tag text)` | `jsonb` | YES | NO |
| `rpc_get_clients_metrics` | `()` | `jsonb` | YES | NO |
| `rpc_get_spa_dashboard` | `()` | `jsonb` | YES | NO |
| `rpc_get_unique_tags` | `()` | `jsonb` | YES | NO |
| `rpc_recalculate_customer_segment` | `(p_contact_id uuid)` | `jsonb` | YES | NO |
| `rpc_update_company_settings` | `(p_settings jsonb)` | `jsonb` | YES | NO |
| `rpc_upsert_marketing_contact` | `(p_contact jsonb)` | `jsonb` | YES | NO |
| `search_contacts` | `(p_query text)` | `SETOF crm_marketing_contacts` | YES | NO |
| `search_contacts_by_phone` | `(p_phone text)` | `SETOF crm_marketing_contacts` | YES | NO |
| `handle_new_user` | `()` | `trigger` | YES | NO |
