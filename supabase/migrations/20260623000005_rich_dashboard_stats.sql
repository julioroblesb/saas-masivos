-- =====================================================
-- MIGRACIÓN DE MÉTRICAS RICAS PARA EL PANEL DE CONTROL
-- Fecha: 2026-06-23
-- Descripción: Reemplaza rpc_get_spa_dashboard para devolver
--              métricas, actividad reciente y datos de gráficos.
-- =====================================================

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
    -- Clientes atendidos hoy (según zona horaria local de la empresa)
    SELECT COUNT(*) INTO v_clients_today FROM spa_visits
    WHERE company_id = v_company_id 
      AND (visit_date AT TIME ZONE 'UTC' AT TIME ZONE v_timezone)::date = (now() AT TIME ZONE 'UTC' AT TIME ZONE v_timezone)::date;

    -- Ingresos de hoy (según zona horaria local de la empresa)
    SELECT COALESCE(SUM(price_charged), 0) INTO v_revenue_today FROM spa_visits
    WHERE company_id = v_company_id 
      AND status = 'completado' 
      AND (completed_at AT TIME ZONE 'UTC' AT TIME ZONE v_timezone)::date = (now() AT TIME ZONE 'UTC' AT TIME ZONE v_timezone)::date;

    -- Mensajes automáticos enviados en los últimos 7 días (usa crm_wa_queue que es la cola real)
    SELECT COUNT(*) INTO v_auto_messages_7d FROM crm_wa_queue
    WHERE company_id = v_company_id 
      AND visit_id IS NOT NULL 
      AND status = 'enviado' 
      AND sent_at >= now() - interval '7 days';

    -- Clientes recuperados (aquellos que tenían un mensaje automático y volvieron a agendar después)
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
            v.visit_date
        FROM spa_visits v
        JOIN crm_marketing_contacts c ON c.id = v.contact_id
        JOIN spa_services s ON s.id = v.service_id
        WHERE v.company_id = v_company_id
        ORDER BY v.visit_date DESC, v.created_at DESC
        LIMIT 5
    ) t;

    -- 5. Datos de Gráfico (Últimos 7 días)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_chart_data
    FROM (
        SELECT 
            d.date_val::text as date,
            COALESCE(SUM(v.price_charged), 0) as revenue,
            COUNT(v.id) as visits
        FROM (
            SELECT ((now() AT TIME ZONE 'UTC' AT TIME ZONE v_timezone)::date - i) as date_val
            FROM generate_series(0, 6) i
        ) d
        LEFT JOIN spa_visits v ON v.company_id = v_company_id 
          AND v.status = 'completado'
          AND (v.completed_at AT TIME ZONE 'UTC' AT TIME ZONE v_timezone)::date = d.date_val
        GROUP BY d.date_val
        ORDER BY d.date_val ASC
    ) t;

    RETURN jsonb_build_object(
        'metrics', v_metrics,
        'recent_activity', v_recent_activity,
        'chart_data', v_chart_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
