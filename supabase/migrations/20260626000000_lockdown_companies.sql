-- =====================================================
-- MIGRACIÓN DE SEGURIDAD
-- Fecha: 2026-06-26
-- Descripción: Eliminar permiso de UPDATE en la tabla companies
-- =====================================================

-- La política anterior usaba WITH CHECK (id = auth_company_id())
-- pero eso solo restringía las FILAS, no las COLUMNAS.
-- Esto permitía a cualquier tenant cambiar su estado a "activa"
-- o extender su fecha de "subscription_end_at" indefinidamente.

DROP POLICY IF EXISTS "companies_tenant_update" ON companies;

-- Al eliminar la política de UPDATE, el cliente de frontend
-- ya no puede modificar la tabla de ninguna manera.
-- Ahora todas las actualizaciones (name, settings) deberán
-- realizarse exclusivamente a través del backend (/api/settings/company)
-- usando la llave SUPABASE_SERVICE_ROLE_KEY.
