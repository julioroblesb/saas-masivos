-- Empresas (tenants)
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'activa', -- activa / suspendida
  created_at timestamptz not null default now()
);

-- Perfiles de usuario (vinculados a auth.users de Supabase)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id), -- null si es super_admin
  role text not null check (role in ('super_admin', 'tenant')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Sesión de WhatsApp por empresa
create table if not exists wa_sessions (
  company_id uuid primary key references companies(id) on delete cascade,
  status text not null default 'desconectado', -- desconectado / conectando / conectado / error
  phone_number text,
  last_connected_at timestamptz,
  last_disconnect_reason text,
  updated_at timestamptz not null default now()
);

-- Credenciales de Baileys (auth state)
create table if not exists wa_auth_state (
  company_id uuid primary key references companies(id) on delete cascade,
  creds jsonb not null,
  keys jsonb not null,
  updated_at timestamptz not null default now()
);

-- Contactos
create table if not exists crm_marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  phone text not null,
  name text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_marketing_contacts_company on crm_marketing_contacts (company_id);
create index if not exists idx_crm_marketing_contacts_tags on crm_marketing_contacts using gin (tags);

-- Campañas
create table if not exists crm_wa_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  message_template text not null,
  status text not null default 'borrador', -- borrador / activa / pausada / completada
  total_contacts int default 0,
  sent_count int default 0,
  failed_count int default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Cola de envío
create table if not exists crm_wa_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  campaign_id uuid not null references crm_wa_campaigns(id) on delete cascade,
  contact_id uuid references crm_marketing_contacts(id),
  phone text not null,
  message text not null,
  status text not null default 'pendiente', -- pendiente / enviando / enviado / fallido
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_wa_queue_campaign_status on crm_wa_queue (campaign_id, status);
create index if not exists idx_crm_wa_queue_company_status on crm_wa_queue (company_id, status);

-- Updates via ALTERS
ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS delay_after_ms integer;
ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT now();
ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'prueba'; 
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_start_at timestamptz DEFAULT now();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end_at timestamptz DEFAULT (now() + interval '3 days');

ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS bb_project_id text;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS bb_host text;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS next_allowed_send_at timestamptz;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS last_message_sent_at timestamptz;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS connection_started_at timestamptz;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS daily_sent_count integer DEFAULT 0;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS daily_reset_at timestamptz;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS consecutive_errors integer DEFAULT 0;

ALTER TABLE crm_marketing_contacts ADD COLUMN IF NOT EXISTS opt_in_source text;
ALTER TABLE crm_marketing_contacts ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
DO $$ BEGIN
    IF NOT EXISTS (SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'crm_marketing_contacts' AND constraint_name = 'uq_company_phone') THEN
        ALTER TABLE crm_marketing_contacts ADD CONSTRAINT uq_company_phone UNIQUE (company_id, phone);
    END IF;
END $$;

ALTER TABLE crm_wa_campaigns ADD COLUMN IF NOT EXISTS sequence jsonb;
ALTER TABLE crm_wa_campaigns ADD COLUMN IF NOT EXISTS min_delay_sec int DEFAULT 45;
ALTER TABLE crm_wa_campaigns ADD COLUMN IF NOT EXISTS max_delay_sec int DEFAULT 90;
ALTER TABLE crm_wa_campaigns ADD COLUMN IF NOT EXISTS replied_count int default 0;

ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT now();
ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS replied boolean default false;
create index if not exists crm_wa_queue_company_phone_sent_idx on crm_wa_queue (company_id, phone, sent_at desc);

-- RLS
alter table crm_marketing_contacts enable row level security;
alter table crm_wa_campaigns enable row level security;
alter table crm_wa_queue enable row level security;
alter table wa_sessions enable row level security;
alter table companies enable row level security;
alter table profiles enable row level security;

create or replace function auth_company_id() returns uuid language sql stable as $$
  select company_id from profiles where id = auth.uid()
$$;

-- Drop all policies to recreate them securely and idempotently
DROP POLICY IF EXISTS "tenant_isolation_all" ON crm_marketing_contacts;
DROP POLICY IF EXISTS "tenant_isolation_all_camp" ON crm_wa_campaigns;
DROP POLICY IF EXISTS "tenant_isolation_all_queue" ON crm_wa_queue;
DROP POLICY IF EXISTS "tenant_isolation_all_sessions" ON wa_sessions;

DROP POLICY IF EXISTS "tenant_isolation_select" ON crm_marketing_contacts;
DROP POLICY IF EXISTS "tenant_isolation_select_camp" ON crm_wa_campaigns;
DROP POLICY IF EXISTS "tenant_isolation_select_queue" ON crm_wa_queue;
DROP POLICY IF EXISTS "tenant_isolation_select_sessions" ON wa_sessions;
DROP POLICY IF EXISTS "profiles_self_select" ON profiles;
DROP POLICY IF EXISTS "companies_tenant_select" ON companies;
DROP POLICY IF EXISTS "companies_tenant_update" ON companies;

-- Create Select/Update safe policies
CREATE POLICY "tenant_isolation_select" on crm_marketing_contacts for select using (company_id = auth_company_id());
CREATE POLICY "tenant_isolation_select_camp" on crm_wa_campaigns for select using (company_id = auth_company_id());
CREATE POLICY "tenant_isolation_select_queue" on crm_wa_queue for select using (company_id = auth_company_id());
CREATE POLICY "tenant_isolation_select_sessions" ON wa_sessions FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "profiles_self_select" on profiles for select using (id = auth.uid());
CREATE POLICY "companies_tenant_select" on companies for select using (id = auth_company_id());
create policy "companies_tenant_update" on companies for update using (id = auth_company_id());

-- RPCs
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[]);
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[], text);
DROP FUNCTION IF EXISTS rpc_batch_insert_marketing_contacts(jsonb);
DROP FUNCTION IF EXISTS rpc_delete_marketing_contact(uuid);
DROP FUNCTION IF EXISTS search_contacts(text);
DROP FUNCTION IF EXISTS search_contacts(uuid, text, int, int);
DROP FUNCTION IF EXISTS rpc_create_campaign(text, text, jsonb, int, int);
DROP FUNCTION IF EXISTS rpc_cancel_campaign(uuid);
DROP FUNCTION IF EXISTS increment_campaign_sent(uuid);
DROP FUNCTION IF EXISTS increment_campaign_failed(uuid);
DROP FUNCTION IF EXISTS rpc_get_clients_metrics();
DROP FUNCTION IF EXISTS rpc_archive_contacts(uuid[], boolean);

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

CREATE OR REPLACE FUNCTION rpc_batch_insert_marketing_contacts(p_contacts JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
  IF jsonb_array_length(p_contacts) > 1000 THEN
    RAISE EXCEPTION 'El limite por lote es de 1000 contactos.';
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_phone := v_contact->>'phone';
    v_name := v_contact->>'name';
    v_opt_in_source := v_contact->>'opt_in_source';

    SELECT array_agg(trim(tag::text, '"')) INTO v_tags
    FROM jsonb_array_elements(v_contact->'tags') AS tag
    WHERE trim(tag::text, '"') != '';

    IF v_tags IS NULL THEN v_tags := ARRAY[]::TEXT[]; END IF;
    IF v_phone IS NULL OR v_phone = '' THEN CONTINUE; END IF;

    SELECT id INTO v_existing_id
    FROM crm_marketing_contacts
    WHERE company_id = v_company_id AND phone = v_phone
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE crm_marketing_contacts
      SET 
        name = COALESCE(v_name, name),
        tags = ARRAY(SELECT DISTINCT unnest(tags || v_tags)),
        opt_in_source = COALESCE(v_opt_in_source, opt_in_source),
        updated_at = NOW()
      WHERE id = v_existing_id;
      v_updated_count := v_updated_count + 1;
    ELSE
      INSERT INTO crm_marketing_contacts (
        company_id, phone, name, tags, opt_in_source
      ) VALUES (
        v_company_id, v_phone, v_name, v_tags, v_opt_in_source
      );
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted_count, 'updated', v_updated_count);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_marketing_contact(p_contact_id uuid) RETURNS jsonb 
SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
    v_deleted int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    DELETE FROM crm_marketing_contacts WHERE id = p_contact_id AND company_id = v_company_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_contacts(p_company_id uuid, p_query text, p_limit int DEFAULT 50, p_offset int DEFAULT 0) RETURNS SETOF crm_marketing_contacts 
SET search_path = public, pg_temp AS $$
BEGIN
    IF (SELECT company_id FROM profiles WHERE id = auth.uid()) != p_company_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
    IF p_query IS NULL OR p_query = '' THEN
        RETURN QUERY SELECT * FROM crm_marketing_contacts WHERE company_id = p_company_id ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset;
    ELSE
        RETURN QUERY SELECT * FROM crm_marketing_contacts WHERE company_id = p_company_id AND (phone ILIKE '%' || p_query || '%' OR name ILIKE '%' || p_query || '%') ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_create_campaign(p_name text, p_target_tag text, p_sequence jsonb, p_min_delay_sec int, p_max_delay_sec int) RETURNS jsonb 
SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
    v_campaign_id uuid;
    v_company_status text;
    v_queued_items int := 0;
    contact_rec record;
    seq_step jsonb;
    v_seq_length int;
    v_idx int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    SELECT status INTO v_company_status FROM companies WHERE id = v_company_id;
    IF v_company_status IS NULL OR v_company_status != 'activa' THEN
        RAISE EXCEPTION 'La empresa no se encuentra activa.';
    END IF;
    IF p_min_delay_sec < 10 THEN
        RAISE EXCEPTION 'El delay mínimo no puede ser menor a 10 segundos para evitar baneos.';
    END IF;

    v_seq_length := jsonb_array_length(p_sequence);

    INSERT INTO crm_wa_campaigns (company_id, name, message_template, sequence, min_delay_sec, max_delay_sec, status, total_contacts)
    VALUES (v_company_id, p_name, 'Sequence (Backend Resolved)', p_sequence, p_min_delay_sec, p_max_delay_sec, 'running', 0)
    RETURNING id INTO v_campaign_id;

    FOR contact_rec IN SELECT id, phone, name FROM crm_marketing_contacts WHERE company_id = v_company_id AND (p_target_tag = '' OR p_target_tag = ANY(tags)) LOOP
        v_idx := 0;
        FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence) LOOP
            v_idx := v_idx + 1;
            INSERT INTO crm_wa_queue (company_id, campaign_id, contact_id, phone, message, status, scheduled_for, delay_after_ms)
            VALUES (v_company_id, v_campaign_id, contact_rec.id, contact_rec.phone, seq_step->>'content', 'pendiente', now() + (v_idx * interval '1 millisecond'), CASE WHEN v_idx = v_seq_length THEN NULL ELSE (seq_step->>'delayAfterMs')::int END);
            v_queued_items := v_queued_items + 1;
        END LOOP;
    END LOOP;

    UPDATE crm_wa_campaigns SET total_contacts = v_queued_items WHERE id = v_campaign_id;
    RETURN jsonb_build_object('success', true, 'campaign_id', v_campaign_id, 'queued_items', v_queued_items);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_cancel_campaign(p_campaign_id uuid) RETURNS jsonb 
SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
    v_removed int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    UPDATE crm_wa_campaigns SET status = 'cancelada' WHERE id = p_campaign_id AND company_id = v_company_id AND status IN ('activa', 'borrador', 'queued', 'running');
    DELETE FROM crm_wa_queue WHERE campaign_id = p_campaign_id AND company_id = v_company_id AND status = 'pendiente';
    GET DIAGNOSTICS v_removed = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'items_removed', v_removed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_sent(p_campaign_id uuid) RETURNS void 
SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE crm_wa_campaigns
    SET sent_count = sent_count + 1, status = CASE WHEN sent_count + 1 + failed_count >= total_contacts THEN 'completed' ELSE status END
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_failed(p_campaign_id uuid) RETURNS void 
SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE crm_wa_campaigns
    SET failed_count = failed_count + 1, status = CASE WHEN sent_count + failed_count + 1 >= total_contacts THEN 'completed' ELSE status END
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_get_clients_metrics()
RETURNS TABLE (
    id uuid,
    phone text,
    name text,
    is_archived boolean,
    created_at timestamptz,
    campaigns_count bigint,
    last_message_sent_at timestamptz,
    last_reply_at timestamptz
) 
SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE profiles.id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    RETURN QUERY
    SELECT 
        c.id,
        c.phone::text,
        c.name::text,
        c.is_archived,
        c.created_at,
        COUNT(DISTINCT CASE WHEN q.status = 'enviado' THEN q.campaign_id ELSE NULL END)::bigint as campaigns_count,
        MAX(CASE WHEN q.status = 'enviado' THEN COALESCE(q.sent_at, q.created_at) ELSE NULL END) as last_message_sent_at,
        MAX(CASE WHEN q.replied = true THEN COALESCE(q.sent_at, q.created_at) ELSE NULL END) as last_reply_at
    FROM crm_marketing_contacts c
    LEFT JOIN crm_wa_queue q ON (c.id = q.contact_id) OR (c.company_id = q.company_id AND c.phone = q.phone)
    WHERE c.company_id = v_company_id
    GROUP BY c.id, c.phone, c.name, c.is_archived, c.created_at
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_archive_contacts(p_contact_ids uuid[], p_archive boolean) RETURNS void
SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    UPDATE crm_marketing_contacts
    SET is_archived = p_archive
    WHERE company_id = v_company_id AND id = ANY(p_contact_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- RENOVA — Spa & Belleza CRM Tables
-- ============================================================

-- Nuevos campos en contactos
ALTER TABLE crm_marketing_contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE crm_marketing_contacts ADD COLUMN IF NOT EXISTS birthday VARCHAR(5);
ALTER TABLE crm_marketing_contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Catálogo de servicios
CREATE TABLE IF NOT EXISTS spa_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    min_price NUMERIC(10,2),
    promo_price NUMERIC(10,2),
    duration_days INTEGER NOT NULL DEFAULT 30,
    care_instructions TEXT,
    care_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spa_services_company ON spa_services(company_id);

-- Catálogo de productos
CREATE TABLE IF NOT EXISTS spa_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spa_products_company ON spa_products(company_id);

-- Registro de atenciones
CREATE TABLE IF NOT EXISTS spa_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_marketing_contacts(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES spa_services(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'en_curso',
    visit_date TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    price_charged NUMERIC(10,2),
    follow_up_date TIMESTAMPTZ,
    follow_up_sent BOOLEAN DEFAULT false,
    care_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spa_visits_company ON spa_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_spa_visits_contact ON spa_visits(contact_id);
CREATE INDEX IF NOT EXISTS idx_spa_visits_status ON spa_visits(company_id, status);

-- Cola de follow-ups automáticos
CREATE TABLE IF NOT EXISTS spa_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES spa_visits(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_marketing_contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    media_url TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pendiente',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spa_follow_ups_pending ON spa_follow_ups(company_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_spa_follow_ups_type ON spa_follow_ups(type, status);

-- RLS para nuevas tablas
ALTER TABLE spa_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE spa_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE spa_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE spa_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spa_services_tenant_select" ON spa_services;
DROP POLICY IF EXISTS "spa_services_tenant_insert" ON spa_services;
DROP POLICY IF EXISTS "spa_services_tenant_update" ON spa_services;
DROP POLICY IF EXISTS "spa_services_tenant_delete" ON spa_services;
CREATE POLICY "spa_services_tenant_select" ON spa_services FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "spa_services_tenant_insert" ON spa_services FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_services_tenant_update" ON spa_services FOR UPDATE USING (company_id = auth_company_id());
CREATE POLICY "spa_services_tenant_delete" ON spa_services FOR DELETE USING (company_id = auth_company_id());

DROP POLICY IF EXISTS "spa_products_tenant_select" ON spa_products;
DROP POLICY IF EXISTS "spa_products_tenant_insert" ON spa_products;
DROP POLICY IF EXISTS "spa_products_tenant_update" ON spa_products;
DROP POLICY IF EXISTS "spa_products_tenant_delete" ON spa_products;
CREATE POLICY "spa_products_tenant_select" ON spa_products FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "spa_products_tenant_insert" ON spa_products FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_products_tenant_update" ON spa_products FOR UPDATE USING (company_id = auth_company_id());
CREATE POLICY "spa_products_tenant_delete" ON spa_products FOR DELETE USING (company_id = auth_company_id());

DROP POLICY IF EXISTS "spa_visits_tenant_select" ON spa_visits;
DROP POLICY IF EXISTS "spa_visits_tenant_insert" ON spa_visits;
DROP POLICY IF EXISTS "spa_visits_tenant_update" ON spa_visits;
CREATE POLICY "spa_visits_tenant_select" ON spa_visits FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "spa_visits_tenant_insert" ON spa_visits FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "spa_visits_tenant_update" ON spa_visits FOR UPDATE USING (company_id = auth_company_id());

DROP POLICY IF EXISTS "spa_follow_ups_tenant_select" ON spa_follow_ups;
CREATE POLICY "spa_follow_ups_tenant_select" ON spa_follow_ups FOR SELECT USING (company_id = auth_company_id());

-- RPC: Completar visita y programar follow-ups
DROP FUNCTION IF EXISTS rpc_complete_visit(uuid);
CREATE OR REPLACE FUNCTION rpc_complete_visit(p_visit_id uuid)
RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
    v_visit record;
    v_service record;
    v_contact record;
    v_settings jsonb;
    v_care_msg text;
    v_followup_msg text;
    v_follow_up_date timestamptz;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    SELECT * INTO v_visit FROM spa_visits WHERE id = p_visit_id AND company_id = v_company_id;
    IF v_visit IS NULL THEN RAISE EXCEPTION 'Visita no encontrada'; END IF;
    IF v_visit.status = 'completado' THEN RAISE EXCEPTION 'La visita ya fue completada'; END IF;

    SELECT * INTO v_service FROM spa_services WHERE id = v_visit.service_id;
    SELECT * INTO v_contact FROM crm_marketing_contacts WHERE id = v_visit.contact_id;
    SELECT settings INTO v_settings FROM companies WHERE id = v_company_id;

    v_follow_up_date := now() + (v_service.duration_days || ' days')::interval;

    UPDATE spa_visits SET 
        status = 'completado', completed_at = now(), follow_up_date = v_follow_up_date
    WHERE id = p_visit_id;

    -- Mensaje de cuidados (inmediato)
    IF COALESCE(v_settings->'auto_messages'->>'care_enabled', 'true') = 'true' 
       AND (v_service.care_instructions IS NOT NULL OR v_service.care_image_url IS NOT NULL) THEN
        v_care_msg := COALESCE(v_settings->'auto_messages'->>'care_template',
            '¡Hola {{nombre}}! 💆‍♀️ Gracias por visitarnos. Te compartimos los cuidados para tu {{servicio}}:');
        v_care_msg := REPLACE(v_care_msg, '{{nombre}}', COALESCE(v_contact.name, 'cliente'));
        v_care_msg := REPLACE(v_care_msg, '{{servicio}}', v_service.name);
        IF v_service.care_instructions IS NOT NULL THEN
            v_care_msg := v_care_msg || E'\n\n' || v_service.care_instructions;
        END IF;
        INSERT INTO spa_follow_ups (company_id, visit_id, contact_id, type, phone, message, media_url, scheduled_for)
        VALUES (v_company_id, p_visit_id, v_contact.id, 'care', v_contact.phone, v_care_msg, v_service.care_image_url, now());
        UPDATE spa_visits SET care_sent = true WHERE id = p_visit_id;
    END IF;

    -- Mensaje de reactivación (en X días)
    IF COALESCE(v_settings->'auto_messages'->>'follow_up_enabled', 'true') = 'true' THEN
        v_followup_msg := COALESCE(v_settings->'auto_messages'->>'follow_up_template',
            '¡Hola {{nombre}}! 💇‍♀️ Han pasado {{dias}} días desde tu {{servicio}}. ¿Qué tal si vienes a darte un mantenimiento?');
        v_followup_msg := REPLACE(v_followup_msg, '{{nombre}}', COALESCE(v_contact.name, 'cliente'));
        v_followup_msg := REPLACE(v_followup_msg, '{{servicio}}', v_service.name);
        v_followup_msg := REPLACE(v_followup_msg, '{{dias}}', v_service.duration_days::text);
        IF v_service.promo_price IS NOT NULL THEN
            v_followup_msg := REPLACE(v_followup_msg, '{{precio_normal}}', v_service.price::text);
            v_followup_msg := REPLACE(v_followup_msg, '{{precio_promo}}', v_service.promo_price::text);
            IF v_followup_msg NOT LIKE '%precio%' AND v_followup_msg NOT LIKE '%S/%' THEN
                v_followup_msg := v_followup_msg || E'\n\n✨ Precio normal: S/' || v_service.price::text || E'\n🔥 Precio especial para ti: S/' || v_service.promo_price::text;
            END IF;
        END IF;
        INSERT INTO spa_follow_ups (company_id, visit_id, contact_id, type, phone, message, scheduled_for)
        VALUES (v_company_id, p_visit_id, v_contact.id, 'follow_up', v_contact.phone, v_followup_msg, v_follow_up_date);
    END IF;

    RETURN jsonb_build_object('success', true, 'follow_up_date', v_follow_up_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Dashboard spa
DROP FUNCTION IF EXISTS rpc_get_spa_dashboard();
CREATE OR REPLACE FUNCTION rpc_get_spa_dashboard()
RETURNS jsonb SET search_path = public, pg_temp AS $$
DECLARE
    v_company_id uuid;
    v_clients_today int;
    v_revenue_today numeric;
    v_auto_messages_7d int;
    v_recovered_clients int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

    SELECT COUNT(*) INTO v_clients_today FROM spa_visits
    WHERE company_id = v_company_id AND visit_date::date = CURRENT_DATE;

    SELECT COALESCE(SUM(price_charged), 0) INTO v_revenue_today FROM spa_visits
    WHERE company_id = v_company_id AND status = 'completado' AND completed_at::date = CURRENT_DATE;

    SELECT COUNT(*) INTO v_auto_messages_7d FROM spa_follow_ups
    WHERE company_id = v_company_id AND status = 'enviado' AND sent_at >= now() - interval '7 days';

    SELECT COUNT(DISTINCT v2.contact_id) INTO v_recovered_clients
    FROM spa_follow_ups f
    JOIN spa_visits v2 ON v2.contact_id = f.contact_id AND v2.company_id = f.company_id AND v2.visit_date > f.sent_at
    WHERE f.company_id = v_company_id AND f.type = 'follow_up' AND f.status = 'enviado';

    RETURN jsonb_build_object('clients_today', v_clients_today, 'revenue_today', v_revenue_today,
        'auto_messages_7d', v_auto_messages_7d, 'recovered_clients', v_recovered_clients);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar rpc_upsert para nuevos campos
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[], text);
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
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar rpc_get_clients_metrics para nuevos campos
DROP FUNCTION IF EXISTS rpc_get_clients_metrics();
CREATE OR REPLACE FUNCTION rpc_get_clients_metrics()
RETURNS TABLE (
    id uuid, phone text, name text, email text, birthday text, notes text,
    is_archived boolean, created_at timestamptz,
    campaigns_count bigint, last_message_sent_at timestamptz, last_reply_at timestamptz,
    total_visits bigint, last_visit_at timestamptz, last_service_name text
) SET search_path = public, pg_temp AS $$
DECLARE v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE profiles.id = auth.uid();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
    RETURN QUERY
    SELECT c.id, c.phone::text, c.name::text, c.email::text, c.birthday::text, c.notes::text,
        c.is_archived, c.created_at,
        COUNT(DISTINCT CASE WHEN q.status = 'enviado' THEN q.campaign_id ELSE NULL END)::bigint,
        MAX(CASE WHEN q.status = 'enviado' THEN COALESCE(q.sent_at, q.created_at) ELSE NULL END),
        MAX(CASE WHEN q.replied = true THEN COALESCE(q.sent_at, q.created_at) ELSE NULL END),
        (SELECT COUNT(*)::bigint FROM spa_visits sv WHERE sv.contact_id = c.id AND sv.status = 'completado'),
        (SELECT MAX(sv.visit_date) FROM spa_visits sv WHERE sv.contact_id = c.id),
        (SELECT ss.name FROM spa_visits sv JOIN spa_services ss ON ss.id = sv.service_id WHERE sv.contact_id = c.id ORDER BY sv.visit_date DESC LIMIT 1)::text
    FROM crm_marketing_contacts c
    LEFT JOIN crm_wa_queue q ON (c.id = q.contact_id) OR (c.company_id = q.company_id AND c.phone = q.phone)
    WHERE c.company_id = v_company_id
    GROUP BY c.id, c.phone, c.name, c.email, c.birthday, c.notes, c.is_archived, c.created_at
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('spa-media', 'spa-media', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "spa_media_tenant_upload" ON storage.objects;
DROP POLICY IF EXISTS "spa_media_public_read" ON storage.objects;
CREATE POLICY "spa_media_tenant_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'spa-media' AND (storage.foldername(name))[1] = auth_company_id()::text);
CREATE POLICY "spa_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'spa-media');

NOTIFY pgrst, 'reload schema';
