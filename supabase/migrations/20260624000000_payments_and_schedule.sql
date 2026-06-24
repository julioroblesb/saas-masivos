-- =====================================================
-- MIGRACIÓN DE SISTEMA DE PAGOS, CITAS FUTURAS Y MÉTRICAS REALES
-- Fecha: 2026-06-24
-- =====================================================

-- 1. Modificar tabla spa_visits
ALTER TABLE spa_visits ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendiente';
ALTER TABLE spa_visits ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;

-- Migrar datos antiguos: establecer scheduled_date igual a visit_date y payment_status a pagado si ya estaba completado
UPDATE spa_visits SET scheduled_date = visit_date WHERE scheduled_date IS NULL;
UPDATE spa_visits SET payment_status = 'pagado' WHERE status = 'completado' AND payment_status = 'pendiente';

-- 2. Crear tabla spa_payments
CREATE TABLE IF NOT EXISTS spa_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES spa_visits(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL, -- efectivo, yape, plin, transferencia, tarjeta
    payment_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spa_payments_company ON spa_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_spa_payments_visit ON spa_payments(visit_id);
CREATE INDEX IF NOT EXISTS idx_spa_payments_date ON spa_payments(payment_date);

-- RLS para spa_payments
ALTER TABLE spa_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spa_payments_tenant_select" ON spa_payments;
DROP POLICY IF EXISTS "spa_payments_tenant_insert" ON spa_payments;
DROP POLICY IF EXISTS "spa_payments_tenant_update" ON spa_payments;

CREATE POLICY "spa_payments_tenant_select" ON spa_payments FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "spa_payments_tenant_insert" ON spa_payments FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_payments_tenant_update" ON spa_payments FOR UPDATE USING (company_id = auth_company_id());

-- Migrar pagos antiguos de spa_visits a spa_payments (crear un pago virtual en efectivo por el monto total para las completadas)
INSERT INTO spa_payments (company_id, visit_id, amount, payment_method, payment_date, created_at)
SELECT company_id, id, price_charged, 'efectivo', COALESCE(completed_at, visit_date), COALESCE(completed_at, visit_date)
FROM spa_visits
WHERE status = 'completado' AND price_charged > 0
  AND NOT EXISTS (SELECT 1 FROM spa_payments WHERE visit_id = spa_visits.id);

-- 3. Actualizar función del Dashboard para usar zona horaria local y sumar pagos reales
DROP FUNCTION IF EXISTS rpc_get_spa_dashboard();

CREATE OR REPLACE FUNCTION rpc_get_spa_dashboard()
RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
    v_timezone text;
    v_metrics jsonb;
    v_recent_activity jsonb;
    v_chart_data jsonb;
    
    v_clients_today int;
    v_revenue_today numeric;
    v_auto_messages_7d int;
    v_recovered_clients int;
    v_total_clients int;
    v_pending_messages int;
BEGIN
    -- 1. Verificar Autenticación
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    -- 2. Obtener Timezone de la empresa (por defecto America/Lima)
    SELECT COALESCE(settings->>'timezone', 'America/Lima') INTO v_timezone 
    FROM companies WHERE id = v_company_id;

    -- 3. Métricas
    -- Citas programadas para hoy (basadas en scheduled_date o visit_date local)
    SELECT COUNT(*) INTO v_clients_today FROM spa_visits
    WHERE company_id = v_company_id 
      AND status != 'cancelado'
      AND (COALESCE(scheduled_date, visit_date) AT TIME ZONE v_timezone)::date = (now() AT TIME ZONE v_timezone)::date;

    -- Ingresos de hoy REALES (suma de spa_payments realizados hoy)
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_today FROM spa_payments
    WHERE company_id = v_company_id 
      AND (payment_date AT TIME ZONE v_timezone)::date = (now() AT TIME ZONE v_timezone)::date;

    -- Mensajes automáticos enviados en los últimos 7 días (usa crm_wa_queue)
    SELECT COUNT(*) INTO v_auto_messages_7d FROM crm_wa_queue
    WHERE company_id = v_company_id 
      AND visit_id IS NOT NULL 
      AND status = 'enviado' 
      AND sent_at >= now() - interval '7 days';

    -- Clientes recuperados
    SELECT COUNT(DISTINCT v2.contact_id) INTO v_recovered_clients
    FROM crm_wa_queue q
    JOIN spa_visits v2 ON v2.contact_id = q.contact_id 
      AND v2.company_id = q.company_id 
      AND v2.visit_date > q.sent_at
    WHERE q.company_id = v_company_id 
      AND q.visit_id IS NOT NULL 
      AND q.status = 'enviado' 
      AND v2.status = 'completado';

    -- Total clientes activos (CRM)
    SELECT COUNT(*) INTO v_total_clients FROM crm_marketing_contacts
    WHERE company_id = v_company_id AND is_archived = false;

    -- Mensajes en cola (pendientes de envío)
    SELECT COUNT(*) INTO v_pending_messages FROM crm_wa_queue
    WHERE company_id = v_company_id AND status = 'pendiente';

    v_metrics := jsonb_build_object(
        'clients_today', v_clients_today,
        'revenue_today', v_revenue_today,
        'auto_messages_7d', v_auto_messages_7d,
        'recovered_clients', v_recovered_clients,
        'total_clients', v_total_clients,
        'pending_messages', v_pending_messages
    );

    -- 4. Actividad Reciente (Últimas 5 visitas con nombres reales)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_recent_activity
    FROM (
        SELECT 
            v.id,
            c.name as contact_name,
            c.phone as contact_phone,
            s.name as service_name,
            v.price_charged,
            v.status,
            COALESCE(v.scheduled_date, v.visit_date) as visit_date,
            v.payment_status,
            (SELECT COALESCE(SUM(amount), 0) FROM spa_payments p WHERE p.visit_id = v.id) as amount_paid
        FROM spa_visits v
        JOIN crm_marketing_contacts c ON c.id = v.contact_id
        JOIN spa_services s ON s.id = v.service_id
        WHERE v.company_id = v_company_id
        ORDER BY COALESCE(v.scheduled_date, v.visit_date) DESC, v.created_at DESC
        LIMIT 5
    ) t;

    -- 5. Datos de Gráfico (Últimos 7 días - Ingresos Reales vs Atenciones)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_chart_data
    FROM (
        SELECT 
            d.date_val::text as date,
            COALESCE((
                SELECT SUM(p.amount)
                FROM spa_payments p
                WHERE p.company_id = v_company_id
                  AND (p.payment_date AT TIME ZONE v_timezone)::date = d.date_val
            ), 0) as revenue,
            COALESCE((
                SELECT COUNT(v.id)
                FROM spa_visits v
                WHERE v.company_id = v_company_id
                  AND v.status != 'cancelado'
                  AND (COALESCE(v.scheduled_date, v.visit_date) AT TIME ZONE v_timezone)::date = d.date_val
            ), 0) as visits
        FROM (
            SELECT ((now() AT TIME ZONE v_timezone)::date - i) as date_val
            FROM generate_series(0, 6) i
        ) d
        ORDER BY d.date_val ASC
    ) t;

    RETURN jsonb_build_object(
        'metrics', v_metrics,
        'recent_activity', v_recent_activity,
        'chart_data', v_chart_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Delete Marketing Contact RPC
CREATE OR REPLACE FUNCTION rpc_delete_marketing_contact(p_contact_id uuid)
RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE 
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    DELETE FROM crm_marketing_contacts
    WHERE id = p_contact_id AND company_id = v_company_id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Contacto no encontrado');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
