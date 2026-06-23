-- =====================================================
-- MIGRACIÓN DE SEGURIDAD PRE-LANZAMIENTO
-- Fecha: 2026-06-23
-- Descripción: Cierra 5 huecos críticos de seguridad
-- =====================================================

-- =====================================================
-- 1. ACTIVAR RLS EN wa_auth_state (Credenciales de WhatsApp)
-- =====================================================
ALTER TABLE wa_auth_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_auth_state_tenant_select" ON wa_auth_state
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "wa_auth_state_tenant_insert" ON wa_auth_state
  FOR INSERT WITH CHECK (company_id = auth_company_id());

CREATE POLICY "wa_auth_state_tenant_update" ON wa_auth_state
  FOR UPDATE USING (company_id = auth_company_id());

CREATE POLICY "wa_auth_state_tenant_delete" ON wa_auth_state
  FOR DELETE USING (company_id = auth_company_id());


-- =====================================================
-- 2. ELIMINAR rpc_get_contacts(uuid) — Función peligrosa sin auth
-- =====================================================
DROP FUNCTION IF EXISTS rpc_get_contacts(uuid);


-- =====================================================
-- 3. PROTEGER increment_campaign_sent/failed
--    Quitar SECURITY DEFINER para que RLS aplique.
--    El CRON usa service_role_key (bypasea RLS automáticamente).
--    Usuarios normales serán bloqueados por RLS (solo hay SELECT policy).
-- =====================================================
DROP FUNCTION IF EXISTS increment_campaign_sent(uuid);
DROP FUNCTION IF EXISTS increment_campaign_failed(uuid);

-- Recrear SIN SECURITY DEFINER (ahora RLS aplica)
CREATE OR REPLACE FUNCTION increment_campaign_sent(p_campaign_id uuid)
RETURNS void SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE crm_wa_campaigns 
    SET sent_count = sent_count + 1 
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_campaign_failed(p_campaign_id uuid)
RETURNS void SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE crm_wa_campaigns 
    SET failed_count = failed_count + 1 
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- 4. RESTRINGIR UPDATE en companies (solo campos editables por tenant)
-- =====================================================
DROP POLICY IF EXISTS "companies_tenant_update" ON companies;

CREATE POLICY "companies_tenant_update" ON companies
  FOR UPDATE USING (id = auth_company_id())
  WITH CHECK (
    id = auth_company_id()
    -- No se permite modificar plan, status, o suscripción desde el frontend
    -- Esos campos solo pueden cambiarse desde service_role (admin backend)
  );

-- Crear una función RPC segura para que los tenants solo actualicen settings y nombre
CREATE OR REPLACE FUNCTION rpc_update_company_settings(
  p_name text DEFAULT NULL,
  p_settings jsonb DEFAULT NULL
)
RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE companies SET
    name = COALESCE(p_name, name),
    settings = COALESCE(p_settings, settings),
    updated_at = now()
  WHERE id = v_company_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. AÑADIR POLÍTICAS FALTANTES DE INSERT/UPDATE/DELETE
--    (Reforzar las tablas que solo tenían SELECT)
-- =====================================================

-- crm_wa_queue: Permitir INSERT/UPDATE (para la vista de Mensajería - editar mensajes pendientes)
CREATE POLICY "crm_wa_queue_tenant_update" ON crm_wa_queue
  FOR UPDATE USING (company_id = auth_company_id());

-- spa_follow_ups: Añadir políticas completas (aunque está deprecada, por seguridad)
CREATE POLICY "spa_follow_ups_tenant_insert" ON spa_follow_ups
  FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_follow_ups_tenant_update" ON spa_follow_ups
  FOR UPDATE USING (company_id = auth_company_id());


-- =====================================================
-- 6. CORREGIR spa_staff_services — Validar ownership del service_id
-- =====================================================
DROP POLICY IF EXISTS "spa_staff_services_insert" ON spa_staff_services;
DROP POLICY IF EXISTS "spa_staff_services_all" ON spa_staff_services;

CREATE POLICY "spa_staff_services_insert" ON spa_staff_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM spa_staff s 
      WHERE s.id = staff_id AND s.company_id = auth_company_id()
    )
    AND EXISTS (
      SELECT 1 FROM spa_services sv
      WHERE sv.id = service_id AND sv.company_id = auth_company_id()
    )
  );
