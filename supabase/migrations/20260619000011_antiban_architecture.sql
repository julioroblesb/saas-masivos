-- 1. Actualizar wa_sessions para Warm-up y Freno Automático
ALTER TABLE wa_sessions 
ADD COLUMN IF NOT EXISTS connection_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_errors INTEGER DEFAULT 0;

-- 2. Actualizar crm_marketing_contacts para Trazabilidad Legal
ALTER TABLE crm_marketing_contacts
ADD COLUMN IF NOT EXISTS opt_in_source VARCHAR(255);

-- 3. Actualizar RPC rpc_upsert_marketing_contact
CREATE OR REPLACE FUNCTION rpc_upsert_marketing_contact(
    p_phone text, p_name text, p_tags text[], p_opt_in_source text DEFAULT NULL
) RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE 
    v_company_id uuid; 
    v_contact_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    INSERT INTO crm_marketing_contacts (company_id, phone, name, tags, opt_in_source)
    VALUES (v_company_id, p_phone, p_name, p_tags, p_opt_in_source)
    ON CONFLICT (company_id, phone) DO UPDATE SET 
        name = EXCLUDED.name, 
        tags = EXCLUDED.tags, 
        opt_in_source = COALESCE(EXCLUDED.opt_in_source, crm_marketing_contacts.opt_in_source),
        updated_at = now()
    RETURNING id INTO v_contact_id;

    RETURN jsonb_build_object('success', true, 'id', v_contact_id);
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Actualizar RPC rpc_batch_insert_marketing_contacts
CREATE OR REPLACE FUNCTION rpc_batch_insert_marketing_contacts(
  p_contacts JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted_count INT := 0;
  v_updated_count INT := 0;
  v_contact JSONB;
  v_phone VARCHAR(20);
  v_name VARCHAR(200);
  v_tags TEXT[];
  v_opt_in_source VARCHAR(255);
  v_existing_id UUID;
  v_company_id UUID;
BEGIN
  -- Verificar límite de seguridad (evitar sobrecarga y abusos)
  IF jsonb_array_length(p_contacts) > 1000 THEN
    RAISE EXCEPTION 'El límite por lote es de 1000 contactos.';
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- 2. Procesar cada contacto en el JSON array
  FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_phone := v_contact->>'phone';
    v_name := v_contact->>'name';
    v_opt_in_source := v_contact->>'opt_in_source';

    -- Limpiar espacios o vacíos del array JSON de tags
    SELECT array_agg(trim(tag::text, '"')) INTO v_tags
    FROM jsonb_array_elements(v_contact->'tags') AS tag
    WHERE trim(tag::text, '"') != '';

    IF v_tags IS NULL THEN
      v_tags := ARRAY[]::TEXT[];
    END IF;

    IF v_phone IS NULL OR v_phone = '' THEN
      CONTINUE; -- Saltar contactos sin teléfono válido
    END IF;

    -- Verificar si existe por phone + company_id
    SELECT id INTO v_existing_id
    FROM crm_marketing_contacts
    WHERE company_id = v_company_id AND phone = v_phone
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Actualizar combinando tags
      UPDATE crm_marketing_contacts
      SET 
        name = COALESCE(v_name, name),
        tags = ARRAY(SELECT DISTINCT unnest(tags || v_tags)),
        opt_in_source = COALESCE(v_opt_in_source, opt_in_source),
        updated_at = NOW()
      WHERE id = v_existing_id;
      
      v_updated_count := v_updated_count + 1;
    ELSE
      -- Insertar nuevo
      INSERT INTO crm_marketing_contacts (
        company_id, phone, name, tags, opt_in_source
      ) VALUES (
        v_company_id, v_phone, v_name, v_tags, v_opt_in_source
      );
      
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted_count,
    'updated', v_updated_count
  );
END;
$$;
