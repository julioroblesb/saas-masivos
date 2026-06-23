-- 1. Modificar crm_marketing_contacts para que birthday sea varchar(5) (MM-DD)
ALTER TABLE crm_marketing_contacts ALTER COLUMN birthday TYPE varchar(5) USING to_char(birthday, 'MM-DD');

-- 2. Modificar rpc_upsert_marketing_contact para aceptar p_birthday como text
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[], text, text, date, text);

CREATE OR REPLACE FUNCTION rpc_upsert_marketing_contact(
    p_phone text, p_name text, p_tags text[], p_opt_in_source text DEFAULT NULL,
    p_email text DEFAULT NULL, p_birthday text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE v_company_id uuid; v_contact_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
    INSERT INTO crm_marketing_contacts (company_id, phone, name, tags, opt_in_source, email, birthday, notes)
    VALUES (v_company_id, p_phone, p_name, p_tags, p_opt_in_source, p_email, p_birthday, p_notes)
    ON CONFLICT (company_id, phone) DO UPDATE SET 
        name = EXCLUDED.name, tags = EXCLUDED.tags, 
        opt_in_source = COALESCE(EXCLUDED.opt_in_source, crm_marketing_contacts.opt_in_source),
        email = COALESCE(EXCLUDED.email, crm_marketing_contacts.email),
        birthday = COALESCE(EXCLUDED.birthday, crm_marketing_contacts.birthday),
        notes = COALESCE(EXCLUDED.notes, crm_marketing_contacts.notes),
        updated_at = now()
    RETURNING id INTO v_contact_id;
    RETURN jsonb_build_object('success', true, 'id', v_contact_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear tabla spa_staff
CREATE TABLE IF NOT EXISTS spa_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    birthday VARCHAR(5),
    role TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spa_staff_company ON spa_staff(company_id);

-- 4. RLS para spa_staff
ALTER TABLE spa_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spa_staff_select" ON spa_staff FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "spa_staff_insert" ON spa_staff FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_staff_update" ON spa_staff FOR UPDATE USING (company_id = auth_company_id());
CREATE POLICY "spa_staff_delete" ON spa_staff FOR DELETE USING (company_id = auth_company_id());

-- 5. Crear tabla spa_staff_services (Muchos a Muchos)
CREATE TABLE IF NOT EXISTS spa_staff_services (
    staff_id UUID NOT NULL REFERENCES spa_staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES spa_services(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, service_id)
);

-- RLS para spa_staff_services
ALTER TABLE spa_staff_services ENABLE ROW LEVEL SECURITY;
-- Utiliza el company_id del staff o del servicio para validar RLS
CREATE POLICY "spa_staff_services_select" ON spa_staff_services FOR SELECT 
USING (EXISTS (SELECT 1 FROM spa_staff s WHERE s.id = staff_id AND s.company_id = auth_company_id()));

CREATE POLICY "spa_staff_services_insert" ON spa_staff_services FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM spa_staff s WHERE s.id = staff_id AND s.company_id = auth_company_id()));

CREATE POLICY "spa_staff_services_delete" ON spa_staff_services FOR DELETE 
USING (EXISTS (SELECT 1 FROM spa_staff s WHERE s.id = staff_id AND s.company_id = auth_company_id()));

-- 6. Agregar staff_id a spa_visits
ALTER TABLE spa_visits ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES spa_staff(id) ON DELETE SET NULL;
