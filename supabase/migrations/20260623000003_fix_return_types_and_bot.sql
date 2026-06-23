-- 1. Actualizar las funciones que devuelven crm_marketing_contacts para refrescar los tipos de retorno
DROP FUNCTION IF EXISTS search_contacts(text);

CREATE OR REPLACE FUNCTION search_contacts(search_term text)
RETURNS setof crm_marketing_contacts
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM crm_marketing_contacts
  WHERE
    phone ilike '%' || search_term || '%'
    OR name ilike '%' || search_term || '%'
    OR array_to_string(tags, ', ') ilike '%' || search_term || '%';
$$;

-- Refrescar la función de obtener contactos (si existe)
DROP FUNCTION IF EXISTS rpc_get_contacts(uuid);
CREATE OR REPLACE FUNCTION rpc_get_contacts(p_company_id uuid)
RETURNS SETOF crm_marketing_contacts AS $$
BEGIN
    RETURN QUERY SELECT * FROM crm_marketing_contacts WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Actualizar rpc_complete_visit para eliminar explícitamente el '+' del número de teléfono
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

    -- 1) Programar mensaje de Agradecimiento (Saldrá en +2 minutos)
    INSERT INTO crm_wa_queue (
        company_id, contact_id, phone, visit_id, 
        message, status, scheduled_for
    ) VALUES (
        v_company_id, v_contact.id, v_clean_phone, p_visit_id,
        v_greeting || ' Queremos agradecerte por tu reciente visita hoy. Por favor recuerda seguir las indicaciones de cuidado para obtener los mejores resultados. ¡Esperamos verte pronto!',
        'pendiente',
        now() + interval '2 minutes'
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

-- 3. Limpiar cualquier número en cola que haya quedado con el +
UPDATE crm_wa_queue SET phone = REPLACE(phone, '+', '') WHERE phone LIKE '+%';
