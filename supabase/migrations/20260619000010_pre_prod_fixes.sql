-- 1. Watchdog Fix: Add processing_started_at
ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

-- 2. RLS Security for wa_sessions (Select Only)
DROP POLICY IF EXISTS "tenant_isolation_all_sessions" ON wa_sessions;
CREATE POLICY "tenant_isolation_select_sessions" ON wa_sessions
  FOR SELECT USING (company_id = auth_company_id());

-- 3. Validation & search_path updates for RPCs

-- create campaign: add company status check
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
    v_company_status text;
    v_campaign_id uuid;
    v_queued_items int := 0;
    seq_step jsonb;
    contact_rec record;
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

    FOR contact_rec IN 
        SELECT id, phone, name 
        FROM crm_marketing_contacts 
        WHERE company_id = v_company_id AND (p_target_tag = '' OR p_target_tag = ANY(tags))
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

    UPDATE crm_wa_campaigns SET total_contacts = v_queued_items WHERE id = v_campaign_id;
    RETURN jsonb_build_object('success', true, 'campaign_id', v_campaign_id, 'queued_items', v_queued_items);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- increment sent / failed
CREATE OR REPLACE FUNCTION increment_campaign_sent(p_campaign_id uuid) RETURNS void 
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE crm_wa_campaigns
    SET sent_count = sent_count + 1,
        status = CASE WHEN sent_count + 1 + failed_count >= total_contacts THEN 'completed' ELSE status END
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_failed(p_campaign_id uuid) RETURNS void 
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE crm_wa_campaigns
    SET failed_count = failed_count + 1,
        status = CASE WHEN sent_count + failed_count + 1 >= total_contacts THEN 'completed' ELSE status END
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- upsert contact
CREATE OR REPLACE FUNCTION rpc_upsert_marketing_contact(
    p_phone text,
    p_name text,
    p_tags text[]
) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_contact_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    INSERT INTO crm_marketing_contacts (company_id, phone, name, tags)
    VALUES (v_company_id, p_phone, p_name, p_tags)
    ON CONFLICT (company_id, phone) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        tags = EXCLUDED.tags,
        updated_at = now()
    RETURNING id INTO v_contact_id;

    RETURN jsonb_build_object('success', true, 'id', v_contact_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- batch insert: limit to 1000
CREATE OR REPLACE FUNCTION rpc_batch_insert_marketing_contacts(p_contacts jsonb) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_inserted int := 0;
    contact_rec jsonb;
    arr_len int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
    
    arr_len := jsonb_array_length(p_contacts);
    IF arr_len > 1000 THEN
        RAISE EXCEPTION 'El límite es de 1000 contactos por lote.';
    END IF;

    FOR contact_rec IN SELECT * FROM jsonb_array_elements(p_contacts)
    LOOP
        INSERT INTO crm_marketing_contacts (company_id, phone, name, tags)
        VALUES (
            v_company_id, 
            contact_rec->>'phone', 
            contact_rec->>'name', 
            ARRAY(SELECT jsonb_array_elements_text(contact_rec->'tags'))
        )
        ON CONFLICT (company_id, phone) DO UPDATE SET 
            name = EXCLUDED.name,
            tags = EXCLUDED.tags,
            updated_at = now();
            
        v_inserted := v_inserted + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'inserted', v_inserted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- delete contact
CREATE OR REPLACE FUNCTION rpc_delete_marketing_contact(p_contact_id uuid) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_deleted int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    
    DELETE FROM crm_marketing_contacts 
    WHERE id = p_contact_id AND company_id = v_company_id;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- delete by tag
CREATE OR REPLACE FUNCTION rpc_delete_marketing_contacts_by_tag(p_tag text) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_deleted int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    
    DELETE FROM crm_marketing_contacts 
    WHERE company_id = v_company_id AND p_tag = ANY(tags);
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- search contacts
CREATE OR REPLACE FUNCTION search_contacts(
    p_company_id uuid,
    p_query text,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
) RETURNS SETOF crm_marketing_contacts 
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verify caller matches company
    IF (SELECT company_id FROM profiles WHERE id = auth.uid()) != p_company_id THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_query IS NULL OR p_query = '' THEN
        RETURN QUERY SELECT * FROM crm_marketing_contacts 
        WHERE company_id = p_company_id 
        ORDER BY created_at DESC 
        LIMIT p_limit OFFSET p_offset;
    ELSE
        RETURN QUERY SELECT * FROM crm_marketing_contacts 
        WHERE company_id = p_company_id AND (phone ILIKE '%' || p_query || '%' OR name ILIKE '%' || p_query || '%')
        ORDER BY created_at DESC 
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPCs for lightweight UI rendering
CREATE OR REPLACE FUNCTION rpc_count_contacts_by_tag(p_target_tag text) RETURNS int
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_count int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    IF p_target_tag = '' THEN
        SELECT count(*) INTO v_count FROM crm_marketing_contacts WHERE company_id = v_company_id;
    ELSE
        SELECT count(*) INTO v_count FROM crm_marketing_contacts 
        WHERE company_id = v_company_id AND p_target_tag = ANY(tags);
    END IF;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION rpc_get_unique_tags() RETURNS text[]
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_id uuid;
    v_tags text[];
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    -- Aggregate unnest tags to unique array
    SELECT array_agg(DISTINCT tag) INTO v_tags
    FROM (
        SELECT unnest(tags) as tag
        FROM crm_marketing_contacts
        WHERE company_id = v_company_id
    ) t
    WHERE tag IS NOT NULL AND tag != '';

    RETURN COALESCE(v_tags, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
