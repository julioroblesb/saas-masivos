-- =====================================================
-- CRM ESTÉTICO - FASE 1
-- Fecha: 2026-06-26
-- Descripción: Ampliación de la tabla de contactos para el perfil estético
-- =====================================================

-- 1. Añadir los campos a la tabla crm_marketing_contacts
ALTER TABLE crm_marketing_contacts
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS allergies_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS preferences TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT DEFAULT 'Nuevo';

-- 2. Función para recalcular el segmento de un cliente
-- Reglas acordadas:
-- - Nuevo: Creado hace menos de 30 días
-- - En Riesgo: Sin visitas en > 60 días
-- - Perdido: Sin visitas en > 120 días
-- - VIP: Más de 2 visitas al mes de promedio
-- - Frecuente: Al menos 1 visita al mes de promedio
CREATE OR REPLACE FUNCTION rpc_recalculate_customer_segment(p_contact_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact RECORD;
  v_days_since_created INTEGER;
  v_days_since_last_visit INTEGER;
  v_months_active NUMERIC;
  v_visits_per_month NUMERIC;
  v_new_segment TEXT;
BEGIN
  -- Obtener datos del cliente
  SELECT created_at, last_visit_date, total_visits 
  INTO v_contact
  FROM crm_marketing_contacts
  WHERE id = p_contact_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_days_since_created := EXTRACT(DAY FROM (NOW() - v_contact.created_at));
  
  IF v_contact.last_visit_date IS NOT NULL THEN
    v_days_since_last_visit := EXTRACT(DAY FROM (NOW() - v_contact.last_visit_date));
  ELSE
    v_days_since_last_visit := v_days_since_created;
  END IF;

  -- Calcular visitas por mes
  v_months_active := GREATEST(1, v_days_since_created / 30.0);
  v_visits_per_month := v_contact.total_visits / v_months_active;

  -- Aplicar lógica de negocio
  IF v_days_since_last_visit > 120 THEN
    v_new_segment := 'Perdido';
  ELSIF v_days_since_last_visit > 60 THEN
    v_new_segment := 'En Riesgo';
  ELSIF v_days_since_created <= 30 THEN
    v_new_segment := 'Nuevo';
  ELSIF v_visits_per_month > 2 THEN
    v_new_segment := 'VIP';
  ELSIF v_visits_per_month >= 1 THEN
    v_new_segment := 'Frecuente';
  ELSE
    v_new_segment := 'Ocasional';
  END IF;

  -- Actualizar registro si cambió
  UPDATE crm_marketing_contacts
  SET customer_segment = v_new_segment
  WHERE id = p_contact_id AND (customer_segment IS NULL OR customer_segment != v_new_segment);

  RETURN v_new_segment;
END;
$$;

-- 3. Crear una vista para que el panel administrativo consuma el CRM de forma optimizada
-- (esto evita queries pesados o cruces innecesarios en el backend)
CREATE OR REPLACE VIEW view_crm_profiles AS
SELECT 
  id,
  company_id,
  name,
  phone,
  email,
  birthday,
  EXTRACT(YEAR FROM AGE(birthday)) as age,
  allergies_and_conditions,
  preferences,
  internal_notes,
  total_spent,
  total_visits,
  last_visit_date,
  customer_segment,
  tags,
  created_at
FROM crm_marketing_contacts;


-- 4. Actualizar el RPC rpc_upsert_marketing_contact para soportar los nuevos campos
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[]);
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[], text);
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text, text, text, text[]);

CREATE OR REPLACE FUNCTION rpc_upsert_marketing_contact(
    p_phone text, 
    p_name text, 
    p_tags text[], 
    p_opt_in_source text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_birthday date DEFAULT NULL,
    p_allergies_and_conditions text DEFAULT NULL,
    p_preferences text DEFAULT NULL,
    p_internal_notes text DEFAULT NULL
) RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE 
    v_company_id uuid; 
    v_contact_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    INSERT INTO crm_marketing_contacts (
      company_id, phone, name, tags, opt_in_source, email, birthday, allergies_and_conditions, preferences, internal_notes
    )
    VALUES (
      v_company_id, p_phone, p_name, p_tags, p_opt_in_source, p_email, p_birthday, p_allergies_and_conditions, p_preferences, p_internal_notes
    )
    ON CONFLICT (company_id, phone) DO UPDATE SET 
        name = COALESCE(EXCLUDED.name, crm_marketing_contacts.name), 
        tags = EXCLUDED.tags, 
        opt_in_source = COALESCE(EXCLUDED.opt_in_source, crm_marketing_contacts.opt_in_source),
        email = COALESCE(EXCLUDED.email, crm_marketing_contacts.email),
        birthday = COALESCE(EXCLUDED.birthday, crm_marketing_contacts.birthday),
        allergies_and_conditions = COALESCE(EXCLUDED.allergies_and_conditions, crm_marketing_contacts.allergies_and_conditions),
        preferences = COALESCE(EXCLUDED.preferences, crm_marketing_contacts.preferences),
        internal_notes = COALESCE(EXCLUDED.internal_notes, crm_marketing_contacts.internal_notes),
        updated_at = now()
    RETURNING id INTO v_contact_id;

    RETURN jsonb_build_object('success', true, 'id', v_contact_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




-- RE-CREATE rpc_get_clients_metrics TO INCLUDE THE ORIGINAL JOINS + THE NEW CRM FIELDS
DROP FUNCTION IF EXISTS rpc_get_clients_metrics();

CREATE OR REPLACE FUNCTION rpc_get_clients_metrics()
RETURNS TABLE (
    id uuid, 
    phone text, 
    name text, 
    email text, 
    birthday text, 
    allergies_and_conditions text,
    preferences text,
    internal_notes text,
    is_archived boolean, 
    created_at timestamptz,
    campaigns_count bigint, 
    last_message_sent_at timestamptz, 
    last_reply_at timestamptz,
    total_visits bigint, 
    total_spent numeric,
    customer_segment text,
    last_visit_at timestamptz, 
    last_service_name text
) SET search_path = public, pg_temp AS $$
DECLARE v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE profiles.id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
    
    RETURN QUERY
    SELECT 
        c.id, 
        c.phone::text, 
        c.name::text, 
        c.email::text, 
        c.birthday::text, 
        c.allergies_and_conditions::text,
        c.preferences::text,
        c.internal_notes::text,
        COALESCE('archived' = ANY(c.tags), false) as is_archived,
        c.created_at,
        COUNT(DISTINCT CASE WHEN q.status = 'enviado' THEN q.campaign_id ELSE NULL END)::bigint as campaigns_count,
        MAX(CASE WHEN q.status = 'enviado' THEN COALESCE(q.sent_at, q.created_at) ELSE NULL END) as last_message_sent_at,
        MAX(CASE WHEN q.replied = true THEN COALESCE(q.sent_at, q.created_at) ELSE NULL END) as last_reply_at,
        c.total_visits::bigint,
        c.total_spent::numeric,
        c.customer_segment::text,
        c.last_visit_date as last_visit_at,
        (SELECT ss.name FROM spa_visits sv JOIN spa_services ss ON ss.id = sv.service_id WHERE sv.contact_id = c.id ORDER BY sv.visit_date DESC LIMIT 1)::text as last_service_name
    FROM crm_marketing_contacts c
    LEFT JOIN crm_wa_queue q ON (c.id = q.contact_id) OR (c.company_id = q.company_id AND c.phone = q.phone)
    WHERE c.company_id = v_company_id
    GROUP BY c.id
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

