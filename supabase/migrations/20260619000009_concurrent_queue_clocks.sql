-- Add independent clocks to wa_sessions
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS next_allowed_send_at timestamptz;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS last_message_sent_at timestamptz;

-- Revert the scheduled_for assignment in rpc_create_campaign since delays will be resolved at send-time
CREATE OR REPLACE FUNCTION rpc_create_campaign(
    p_name text,
    p_target_tag text,
    p_sequence jsonb,
    p_min_delay_sec int,
    p_max_delay_sec int
) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_campaign_id uuid;
    v_queued_items int := 0;
    seq_step jsonb;
    contact_rec record;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Basic Validation
    IF p_min_delay_sec < 10 THEN
        RAISE EXCEPTION 'El delay mínimo no puede ser menor a 10 segundos para evitar baneos.';
    END IF;

    -- Insertar la campaña
    INSERT INTO crm_wa_campaigns (company_id, name, message_template, sequence, min_delay_sec, max_delay_sec, status, total_contacts)
    VALUES (v_company_id, p_name, 'Sequence (Backend Resolved)', p_sequence, p_min_delay_sec, p_max_delay_sec, 'running', 0)
    RETURNING id INTO v_campaign_id;

    -- Iterar sobre contactos basados en el tag directamente en backend
    FOR contact_rec IN 
        SELECT id, phone, name 
        FROM crm_marketing_contacts 
        WHERE company_id = v_company_id 
          AND (p_target_tag = '' OR p_target_tag = ANY(tags))
    LOOP
        -- Por cada contacto, iteramos la secuencia de mensajes
        FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence)
        LOOP
            INSERT INTO crm_wa_queue (
                company_id, campaign_id, contact_id, phone, message, status, scheduled_for
            )
            VALUES (
                v_company_id, 
                v_campaign_id, 
                contact_rec.id,
                contact_rec.phone, 
                seq_step->>'content',
                'pendiente',
                now() -- Los mensajes ya no pre-calculan su futuro. El reloj de sesión decide cuándo salen.
            );
            v_queued_items := v_queued_items + 1;
        END LOOP;
    END LOOP;

    UPDATE crm_wa_campaigns SET total_contacts = v_queued_items WHERE id = v_campaign_id;

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', v_campaign_id,
        'queued_items', v_queued_items
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
