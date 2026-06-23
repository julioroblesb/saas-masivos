-- Modificar rpc_create_campaign para aceptar arrays específicos en lugar de un tag

DROP FUNCTION IF EXISTS rpc_create_campaign(text, text, jsonb, int, int);

CREATE OR REPLACE FUNCTION rpc_create_campaign(
    p_name text,
    p_target_contact_ids uuid[],
    p_target_raw_phones text[],
    p_sequence jsonb,
    p_min_delay_sec int,
    p_max_delay_sec int
) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_company_status text;
    v_campaign_id uuid;
    v_queued_items int := 0;
    seq_step jsonb;
    contact_rec record;
    raw_phone text;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    -- Validar que la empresa esté activa
    SELECT status INTO v_company_status FROM companies WHERE id = v_company_id;
    IF v_company_status IS NULL OR v_company_status != 'activa' THEN
        RAISE EXCEPTION 'La empresa no se encuentra activa.';
    END IF;

    IF p_min_delay_sec < 10 THEN
        RAISE EXCEPTION 'El delay mínimo no puede ser menor a 10 segundos para evitar baneos.';
    END IF;

    INSERT INTO crm_wa_campaigns (company_id, name, message_template, sequence, min_delay_sec, max_delay_sec, status, total_contacts)
    VALUES (v_company_id, p_name, 'Sequence (Backend Resolved)', p_sequence, p_min_delay_sec, p_max_delay_sec, 'running', 0)
    RETURNING id INTO v_campaign_id;

    -- Encolar los clientes seleccionados (con contact_id)
    IF array_length(p_target_contact_ids, 1) > 0 THEN
        FOR contact_rec IN 
            SELECT id, phone 
            FROM crm_marketing_contacts 
            WHERE company_id = v_company_id AND id = ANY(p_target_contact_ids)
        LOOP
            FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence)
            LOOP
                INSERT INTO crm_wa_queue (
                    company_id, campaign_id, contact_id, phone, message, status, scheduled_for
                )
                VALUES (
                    v_company_id, v_campaign_id, contact_rec.id, contact_rec.phone, 
                    seq_step->>'content', 'pendiente', now()
                );
                v_queued_items := v_queued_items + 1;
            END LOOP;
        END LOOP;
    END IF;

    -- Encolar los números sueltos (sin contact_id)
    IF array_length(p_target_raw_phones, 1) > 0 THEN
        FOR raw_phone IN SELECT unnest(p_target_raw_phones)
        LOOP
            FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence)
            LOOP
                INSERT INTO crm_wa_queue (
                    company_id, campaign_id, contact_id, phone, message, status, scheduled_for
                )
                VALUES (
                    v_company_id, v_campaign_id, NULL, raw_phone, 
                    seq_step->>'content', 'pendiente', now()
                );
                v_queued_items := v_queued_items + 1;
            END LOOP;
        END LOOP;
    END IF;

    UPDATE crm_wa_campaigns SET total_contacts = v_queued_items WHERE id = v_campaign_id;
    RETURN jsonb_build_object('success', true, 'campaign_id', v_campaign_id, 'queued_items', v_queued_items);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
