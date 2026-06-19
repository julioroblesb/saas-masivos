-- Update campaigns table to properly store the sequence
ALTER TABLE crm_wa_campaigns ADD COLUMN sequence jsonb;

-- rpc_create_campaign
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
    current_delay_sec int := 0;
    step_delay int;
    random_extra_delay int;
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
        current_delay_sec := 0;

        -- Por cada contacto, iteramos la secuencia de mensajes
        FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence)
        LOOP
            -- Random delay anti ban between min and max
            random_extra_delay := floor(random() * (p_max_delay_sec - p_min_delay_sec + 1))::int + p_min_delay_sec;
            
            -- Combine base delay from sequence step with random extra delay
            step_delay := COALESCE((seq_step->>'delayAfterMs')::int / 1000, 0) + random_extra_delay;
            current_delay_sec := current_delay_sec + step_delay;

            INSERT INTO crm_wa_queue (
                company_id, campaign_id, contact_id, phone, message, status, scheduled_for
            )
            VALUES (
                v_company_id, 
                v_campaign_id, 
                contact_rec.id,
                contact_rec.phone, 
                -- We store the raw content. The cron will resolve Spintax and variables
                seq_step->>'content',
                'pendiente',
                now() + (current_delay_sec || ' seconds')::interval
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

-- Ensure other functions are secure
CREATE OR REPLACE FUNCTION rpc_cancel_campaign(p_campaign_id uuid) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_removed int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    
    UPDATE crm_wa_campaigns 
    SET status = 'cancelada'
    WHERE id = p_campaign_id AND company_id = v_company_id AND status IN ('activa', 'borrador', 'queued', 'running');

    DELETE FROM crm_wa_queue
    WHERE campaign_id = p_campaign_id AND company_id = v_company_id AND status = 'pendiente';
    
    GET DIAGNOSTICS v_removed = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'items_removed', v_removed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
