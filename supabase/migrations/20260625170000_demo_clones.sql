-- Migración para Fase 1: Entorno Demo y Clones Efímeros

-- 1. Identificar si una empresa es de prueba
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- 2. Función maestra para crear el clon
CREATE OR REPLACE FUNCTION rpc_clone_demo_company(p_template_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_company_id uuid;
    v_template_company companies%ROWTYPE;
    v_template_wa_session wa_sessions%ROWTYPE;
    
    v_old_service_id uuid;
    v_new_service_id uuid;
    
    v_old_staff_id uuid;
    v_new_staff_id uuid;
BEGIN
    -- Validar que la plantilla exista
    SELECT * INTO v_template_company FROM companies WHERE id = p_template_company_id LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Empresa plantilla no encontrada';
    END IF;

    -- A. Clonar la empresa principal
    INSERT INTO companies (name, status, is_demo, settings, plan_type, subscription_start_at, subscription_end_at)
    VALUES (
        v_template_company.name || ' (Invitado)',
        'activa',
        true,
        v_template_company.settings,
        'demo',
        now(),
        now() + interval '2 days'
    )
    RETURNING id INTO v_new_company_id;

    -- B. Clonar sesión de WhatsApp para compartir el número emisor
    SELECT * INTO v_template_wa_session FROM wa_sessions WHERE company_id = p_template_company_id LIMIT 1;
    IF FOUND THEN
        INSERT INTO wa_sessions (company_id, status, phone_number, bb_project_id, bb_host, next_allowed_send_at, last_connected_at)
        VALUES (
            v_new_company_id,
            v_template_wa_session.status,
            v_template_wa_session.phone_number,
            v_template_wa_session.bb_project_id,
            v_template_wa_session.bb_host,
            now(),
            now()
        );
    END IF;

    -- C. Clonar Servicios
    -- Usamos un bucle for simple en caso de que queramos mapear IDs a futuro
    FOR v_old_service_id IN SELECT id FROM spa_services WHERE company_id = p_template_company_id LOOP
        INSERT INTO spa_services (company_id, name, description, price, min_price, promo_price, duration_days, care_instructions, care_image_url, is_active)
        SELECT v_new_company_id, name, description, price, min_price, promo_price, duration_days, care_instructions, care_image_url, is_active
        FROM spa_services WHERE id = v_old_service_id;
    END LOOP;

    -- D. Clonar Trabajadoras (Staff)
    FOR v_old_staff_id IN SELECT id FROM spa_staff WHERE company_id = p_template_company_id LOOP
        INSERT INTO spa_staff (company_id, name, birthday, role, is_active)
        SELECT v_new_company_id, name, birthday, role, is_active
        FROM spa_staff WHERE id = v_old_staff_id
        RETURNING id INTO v_new_staff_id;
        
        -- Truco: Enlazar a este nuevo staff a TODOS los servicios de la nueva empresa demo (para simplificar el demo)
        INSERT INTO spa_staff_services (staff_id, service_id)
        SELECT v_new_staff_id, id FROM spa_services WHERE company_id = v_new_company_id;
    END LOOP;

    -- E. (Opcional) Clonar un par de clientes al CRM para que no esté vacío
    INSERT INTO crm_marketing_contacts (company_id, phone, name, tags, email)
    SELECT v_new_company_id, phone, name, tags, email
    FROM crm_marketing_contacts 
    WHERE company_id = p_template_company_id 
    LIMIT 5;

    RETURN jsonb_build_object(
        'success', true,
        'new_company_id', v_new_company_id
    );
END;
$$;

-- 3. Función para limpiar (El Basurero)
CREATE OR REPLACE FUNCTION rpc_cleanup_demo_companies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_count int;
BEGIN
    -- Borra empresas demo que tengan más de 24 horas de creadas
    DELETE FROM companies 
    WHERE is_demo = true AND created_at < now() - interval '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN jsonb_build_object('success', true, 'deleted_demos', v_deleted_count);
END;
$$;
