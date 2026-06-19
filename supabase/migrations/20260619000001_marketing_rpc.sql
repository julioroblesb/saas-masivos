-- rpc_upsert_marketing_contact
CREATE OR REPLACE FUNCTION rpc_upsert_marketing_contact(
    p_phone text,
    p_name text DEFAULT NULL,
    p_tags text[] DEFAULT '{}'::text[]
) RETURNS setof crm_marketing_contacts AS $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    RETURN QUERY
    INSERT INTO crm_marketing_contacts (company_id, phone, name, tags)
    VALUES (v_company_id, p_phone, p_name, p_tags)
    ON CONFLICT (company_id, phone) 
    DO UPDATE SET name = EXCLUDED.name, tags = EXCLUDED.tags, updated_at = now()
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- rpc_batch_insert_marketing_contacts
CREATE OR REPLACE FUNCTION rpc_batch_insert_marketing_contacts(
    p_contacts jsonb
) RETURNS void AS $$
DECLARE
    v_company_id uuid;
    contact_record jsonb;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    FOR contact_record IN SELECT * FROM jsonb_array_elements(p_contacts)
    LOOP
        INSERT INTO crm_marketing_contacts (company_id, phone, name, tags)
        VALUES (
            v_company_id, 
            contact_record->>'phone', 
            contact_record->>'name', 
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(contact_record->'tags')), '{}'::text[])
        )
        ON CONFLICT (company_id, phone) 
        DO UPDATE SET 
            name = COALESCE(EXCLUDED.name, crm_marketing_contacts.name), 
            tags = EXCLUDED.tags, 
            updated_at = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- rpc_delete_marketing_contact
CREATE OR REPLACE FUNCTION rpc_delete_marketing_contact(p_id uuid) RETURNS void AS $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    
    DELETE FROM crm_marketing_contacts 
    WHERE id = p_id AND company_id = v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- rpc_delete_marketing_contacts_by_tag
CREATE OR REPLACE FUNCTION rpc_delete_marketing_contacts_by_tag(p_tag text) RETURNS void AS $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    
    DELETE FROM crm_marketing_contacts 
    WHERE company_id = v_company_id AND p_tag = ANY(tags);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
