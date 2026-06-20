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

CREATE OR REPLACE FUNCTION rpc_create_campaign(
    p_name text, p_target_tag text, p_sequence jsonb, p_min_delay_sec int, p_max_delay_sec int
) RETURNS jsonb SET search_path = public, pg_temp AS $$
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

    FOR contact_rec IN SELECT id, phone, name FROM crm_marketing_contacts WHERE company_id = v_company_id AND (p_target_tag = '' OR p_target_tag = ANY(tags)) LOOP
        FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence) LOOP
            INSERT INTO crm_wa_queue (company_id, campaign_id, contact_id, phone, message, status, scheduled_for)
            VALUES (v_company_id, v_campaign_id, contact_rec.id, contact_rec.phone, seq_step->>'content', 'pendiente', now());
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
        MAX(q.sent_at) as last_message_sent_at,
        MAX(CASE WHEN q.replied = true THEN q.sent_at ELSE NULL END) as last_reply_at
    FROM crm_marketing_contacts c
    LEFT JOIN crm_wa_queue q ON c.id = q.contact_id
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
