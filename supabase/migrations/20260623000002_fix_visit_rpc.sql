-- 1. Permitir que los mensajes automatizados no requieran campaña (mensajes transaccionales)
ALTER TABLE crm_wa_queue ALTER COLUMN campaign_id DROP NOT NULL;

-- 2. Vincular los mensajes a la visita para no duplicar correos
ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES spa_visits(id) ON DELETE SET NULL;

-- 3. Redefinir la función RPC para que sea robusta (Idempotente) y programe 2 mensajes
CREATE OR REPLACE FUNCTION rpc_complete_visit(p_visit_id uuid)
RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE
    v_visit spa_visits%ROWTYPE;
    v_contact crm_marketing_contacts%ROWTYPE;
    v_company_id uuid;
    v_already_scheduled boolean;
    v_greeting text;
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
        -- Si no hay teléfono, simplemente marcamos éxito sin programar nada para que la web no colapse
        RETURN jsonb_build_object('success', true, 'message', 'Visita completada pero el cliente no tiene teléfono'); 
    END IF;

    -- Verificar si ya existen mensajes programados para esta visita
    SELECT EXISTS(
        SELECT 1 FROM crm_wa_queue 
        WHERE visit_id = p_visit_id 
          AND status IN ('pendiente', 'enviando', 'enviado', 'fallido')
    ) INTO v_already_scheduled;

    -- Si ya se programaron, devolvemos éxito sin hacer nada extra (esto quita el error "La visita ya fue completada")
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
        v_company_id, v_contact.id, v_contact.phone, p_visit_id,
        v_greeting || ' Queremos agradecerte por tu reciente visita hoy. Por favor recuerda seguir las indicaciones de cuidado para obtener los mejores resultados. ¡Esperamos verte pronto!',
        'pendiente',
        now() + interval '2 minutes'
    );

    -- 2) Programar mensaje de Recordatorio (Saldrá en +15 días)
    INSERT INTO crm_wa_queue (
        company_id, contact_id, phone, visit_id, 
        message, status, scheduled_for
    ) VALUES (
        v_company_id, v_contact.id, v_contact.phone, p_visit_id,
        v_greeting || ' Han pasado 15 días desde tu última visita con nosotros. Es el momento ideal para agendar tu próxima sesión y mantener tus resultados. ¡Escríbenos para reservar un nuevo turno!',
        'pendiente',
        now() + interval '15 days'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Mensajes automatizados programados con éxito');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
