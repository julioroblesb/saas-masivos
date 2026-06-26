-- =====================================================
-- UPDATE RPC FOR DNI AND CHECK OVERLAPS
-- =====================================================

DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[], text, text, date, text, text, text);

CREATE OR REPLACE FUNCTION rpc_upsert_marketing_contact(
    p_phone text, 
    p_name text, 
    p_tags text[], 
    p_opt_in_source text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_birthday date DEFAULT NULL,
    p_allergies_and_conditions text DEFAULT NULL,
    p_preferences text DEFAULT NULL,
    p_internal_notes text DEFAULT NULL,
    p_document_number text DEFAULT NULL
) RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE 
    v_company_id uuid; 
    v_contact_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    INSERT INTO crm_marketing_contacts (
        company_id, phone, name, tags, opt_in_source, 
        email, birthday, allergies_and_conditions, preferences, internal_notes, document_number
    )
    VALUES (
        v_company_id, p_phone, p_name, p_tags, p_opt_in_source, 
        p_email, p_birthday, p_allergies_and_conditions, p_preferences, p_internal_notes, p_document_number
    )
    ON CONFLICT (company_id, phone) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, crm_marketing_contacts.name),
        tags = (
            SELECT array_agg(DISTINCT t)
            FROM unnest(array_cat(crm_marketing_contacts.tags, EXCLUDED.tags)) AS t
        ),
        email = COALESCE(EXCLUDED.email, crm_marketing_contacts.email),
        birthday = COALESCE(EXCLUDED.birthday, crm_marketing_contacts.birthday),
        allergies_and_conditions = COALESCE(EXCLUDED.allergies_and_conditions, crm_marketing_contacts.allergies_and_conditions),
        preferences = COALESCE(EXCLUDED.preferences, crm_marketing_contacts.preferences),
        internal_notes = COALESCE(EXCLUDED.internal_notes, crm_marketing_contacts.internal_notes),
        document_number = COALESCE(EXCLUDED.document_number, crm_marketing_contacts.document_number),
        updated_at = now()
    RETURNING id INTO v_contact_id;

    RETURN jsonb_build_object('id', v_contact_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Add function to check for overlapping appointments
CREATE OR REPLACE FUNCTION check_visit_overlap(
    p_staff_id uuid,
    p_visit_date timestamptz,
    p_duration_minutes int,
    p_exclude_visit_id uuid DEFAULT NULL
) RETURNS boolean SET search_path = public, pg_temp AS $$
DECLARE
    v_overlap_exists boolean;
BEGIN
    -- Check if there is any existing visit for this staff that overlaps
    -- Assuming a visit occupies from visit_date to visit_date + duration_minutes
    -- Overlap condition:
    -- (New_Start < Existing_End) AND (New_End > Existing_Start)
    
    SELECT EXISTS (
        SELECT 1 
        FROM spa_visits 
        WHERE staff_id = p_staff_id
          AND status NOT IN ('cancelada', 'no_asistio')
          AND (p_exclude_visit_id IS NULL OR id != p_exclude_visit_id)
          AND p_visit_date < (visit_date + interval '1 minute' * 60) -- Assuming fixed 60 min for now or we could join to get duration
          AND (p_visit_date + interval '1 minute' * p_duration_minutes) > visit_date
    ) INTO v_overlap_exists;

    RETURN v_overlap_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
