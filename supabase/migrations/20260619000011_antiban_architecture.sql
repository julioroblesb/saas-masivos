-- 1. Actualizar wa_sessions para Warm-up y Freno Automático
ALTER TABLE wa_sessions 
ADD COLUMN IF NOT EXISTS connection_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_errors INTEGER DEFAULT 0;

-- 2. Actualizar crm_marketing_contacts para Trazabilidad Legal
ALTER TABLE crm_marketing_contacts
ADD COLUMN IF NOT EXISTS opt_in_source VARCHAR(255);

-- 3. Actualizar RPC rpc_batch_insert_marketing_contacts
CREATE OR REPLACE FUNCTION rpc_batch_insert_marketing_contacts(
  p_company_id UUID,
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
  v_first_name VARCHAR(100);
  v_last_name VARCHAR(100);
  v_tags TEXT[];
  v_opt_in_source VARCHAR(255);
  v_existing_id UUID;
  v_is_super_admin BOOLEAN;
  v_user_company_id UUID;
BEGIN
  -- Verificar límite de seguridad (evitar sobrecarga y abusos)
  IF jsonb_array_length(p_contacts) > 1000 THEN
    RAISE EXCEPTION 'El límite por lote es de 1000 contactos.';
  END IF;

  -- 1. Validar permisos: el usuario debe pertenecer a p_company_id O ser super_admin
  SELECT company_id INTO v_user_company_id
  FROM profiles
  WHERE id = auth.uid();

  SELECT (role = 'super_admin') INTO v_is_super_admin
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT v_is_super_admin AND (v_user_company_id IS NULL OR v_user_company_id != p_company_id) THEN
    RAISE EXCEPTION 'No tienes permiso para insertar contactos en esta empresa.';
  END IF;

  -- 2. Procesar cada contacto en el JSON array
  FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_phone := v_contact->>'phone';
    v_first_name := v_contact->>'first_name';
    v_last_name := v_contact->>'last_name';
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
    WHERE company_id = p_company_id AND phone = v_phone
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Actualizar combinando tags
      UPDATE crm_marketing_contacts
      SET 
        first_name = COALESCE(v_first_name, first_name),
        last_name = COALESCE(v_last_name, last_name),
        tags = ARRAY(SELECT DISTINCT unnest(tags || v_tags)),
        opt_in_source = COALESCE(v_opt_in_source, opt_in_source),
        updated_at = NOW()
      WHERE id = v_existing_id;
      
      v_updated_count := v_updated_count + 1;
    ELSE
      -- Insertar nuevo
      INSERT INTO crm_marketing_contacts (
        company_id, phone, first_name, last_name, tags, opt_in_source, created_by
      ) VALUES (
        p_company_id, v_phone, v_first_name, v_last_name, v_tags, v_opt_in_source, auth.uid()
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
