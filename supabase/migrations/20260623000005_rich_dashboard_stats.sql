-- =====================================================
-- MIGRACIÓN DE MÉTRICAS RICAS Y COMPORTAMIENTO INMEDIATO
-- Fecha: 2026-06-23
-- Descripción: 
--  1. Actualiza rpc_complete_visit para que el agradecimiento sea inmediato (now()).
--  2. Corrige rpc_get_spa_dashboard para usar un único AT TIME ZONE v_timezone.
-- =====================================================

-- -----------------------------------------------------
-- 1. Actualizar rpc_complete_visit para envío inmediato
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_complete_visit(p_visit_id uuid)
RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE
    v_visit spa_visits%ROWTYPE;
    v_contact crm_marketing_contacts%ROWTYPE;
    v_company_id uuid;
    v_already_scheduled boolean;
    v_greeting text;
    v_clean_phone text;
BEGIN
    -- Verificar Autenticación
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    -- Obtener datos de la visita
    SELECT * INTO v_visit FROM spa_visits WHERE id = p_visit_id AND company_id = v_company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Visita no encontrada'; END IF;

    -- Obtener datos del cliente
    SELECT * INTO v_contact FROM crm_marketing_contacts WHERE id = v_visit.contact_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contacto no encontrado'; END IF;
    IF v_contact.phone IS NULL OR v_contact.phone = '' THEN 
        RETURN jsonb_build_object('success', true, 'message', 'Visita completada pero el cliente no tiene teléfono'); 
    END IF;

    -- Limpiar el número de teléfono (quitar el '+')
    v_clean_phone := REPLACE(v_contact.phone, '+', '');

    -- Verificar si ya existen mensajes programados para esta visita
    SELECT EXISTS(
        SELECT 1 FROM crm_wa_queue 
        WHERE visit_id = p_visit_id 
          AND status IN ('pendiente', 'enviando', 'enviado', 'fallido')
    ) INTO v_already_scheduled;

    -- Si ya se programaron, devolvemos éxito sin hacer nada extra
    IF v_already_scheduled THEN
        RETURN jsonb_build_object('success', true, 'message', 'Mensajes ya estaban programados');
    END IF;

    -- Formatear el saludo de forma inteligente
    IF v_contact.name IS NOT NULL AND trim(v_contact.name) <> '' THEN
        v_greeting := '¡Hola ' || trim(v_contact.name) || '!';
    ELSE
        v_greeting := '¡Hola!';
    END IF;

    -- 1) Programar mensaje de Agradecimiento (Ahora es INMEDIATO: now())
    INSERT INTO crm_wa_queue (
        company_id, contact_id, phone, visit_id, 
        message, status, scheduled_for
    ) VALUES (
        v_company_id, v_contact.id, v_clean_phone, p_visit_id,
        v_greeting || ' Queremos agradecerte por tu reciente visita hoy. Por favor recuerda seguir las indicaciones de cuidado para obtener los mejores resultados. ¡Esperamos verte pronto!',
        'pendiente',
        now()
    );

    -- 2) Programar mensaje de Recordatorio (Saldrá en +15 días)
    INSERT INTO crm_wa_queue (
        company_id, contact_id, phone, visit_id, 
        message, status, scheduled_for
    ) VALUES (
        v_company_id, v_contact.id, v_clean_phone, p_visit_id,
        v_greeting || ' Han pasado 15 días desde tu última visita con nosotros. Es el momento ideal para agendar tu próxima sesión y mantener tus resultados. ¡Escríbenos para reservar un nuevo turno!',
        'pendiente',
        now() + interval '15 days'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Mensajes automatizados programados con éxito');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------
-- 2. Corregir rpc_get_spa_dashboard (Timezone único)
-- -----------------------------------------------------
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
      AND (visit_date AT TIME ZONE v_timezone)::date = (now() AT TIME ZONE v_timezone)::date;

    -- Ingresos de hoy (según zona horaria local de la empresa)
    SELECT COALESCE(SUM(price_charged), 0) INTO v_revenue_today FROM spa_visits
    WHERE company_id = v_company_id 
      AND status = 'completado' 
      AND (completed_at AT TIME ZONE v_timezone)::date = (now() AT TIME ZONE v_timezone)::date;

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
            SELECT ((now() AT TIME ZONE v_timezone)::date - i) as date_val
            FROM generate_series(0, 6) i
        ) d
        LEFT JOIN spa_visits v ON v.company_id = v_company_id 
          AND v.status = 'completado'
          AND (v.completed_at AT TIME ZONE v_timezone)::date = d.date_val
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
