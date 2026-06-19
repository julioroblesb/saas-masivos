-- rpc_create_campaign
CREATE OR REPLACE FUNCTION rpc_create_campaign(
    p_name text,
    p_target_tag text,
    p_sequence jsonb,
    p_contacts jsonb,
    p_min_delay_sec int,
    p_max_delay_sec int,
    p_created_by uuid
) RETURNS jsonb AS $$
DECLARE
    v_company_id uuid;
    v_campaign_id uuid;
    v_queued_items int := 0;
    contact_record jsonb;
    msg_record text;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Insertar la campaña
    INSERT INTO crm_wa_campaigns (company_id, name, message_template, status, total_contacts)
    VALUES (v_company_id, p_name, 'Sequence', 'activa', jsonb_array_length(p_contacts))
    RETURNING id INTO v_campaign_id;

    -- Encolar los mensajes para todos los contactos
    FOR contact_record IN SELECT * FROM jsonb_array_elements(p_contacts)
    LOOP
        FOR msg_record IN SELECT * FROM jsonb_array_elements_text(contact_record->'messages')
        LOOP
            INSERT INTO crm_wa_queue (company_id, campaign_id, phone, message, status)
            VALUES (
                v_company_id, 
                v_campaign_id, 
                contact_record->>'phone', 
                msg_record,
                'pendiente'
            );
            v_queued_items := v_queued_items + 1;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', v_campaign_id,
        'queued_items', v_queued_items
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- rpc_cancel_campaign
CREATE OR REPLACE FUNCTION rpc_cancel_campaign(p_campaign_id uuid) RETURNS jsonb AS $$
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

-- increment_campaign_sent
CREATE OR REPLACE FUNCTION increment_campaign_sent(p_campaign_id uuid) RETURNS void AS $$
BEGIN
    UPDATE crm_wa_campaigns
    SET sent_count = sent_count + 1
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_failed(p_campaign_id uuid) RETURNS void AS $$
BEGIN
    UPDATE crm_wa_campaigns
    SET failed_count = failed_count + 1
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
