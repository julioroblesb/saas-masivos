-- Empresas (tenants)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'activa', -- activa / suspendida
  created_at timestamptz not null default now()
);

-- Perfiles de usuario (vinculados a auth.users de Supabase)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id), -- null si es super_admin
  role text not null check (role in ('super_admin', 'tenant')),
  full_name text,
  created_at timestamptz not null default now()
);

-- SesiÃ³n de WhatsApp por empresa
create table wa_sessions (
  company_id uuid primary key references companies(id) on delete cascade,
  status text not null default 'desconectado', -- desconectado / conectando / conectado / error
  phone_number text,
  last_connected_at timestamptz,
  last_disconnect_reason text,
  updated_at timestamptz not null default now()
);

-- Credenciales de Baileys (auth state), aisladas y nunca expuestas al frontend
create table wa_auth_state (
  company_id uuid primary key references companies(id) on delete cascade,
  creds jsonb not null,        -- credenciales principales de Baileys
  keys jsonb not null,         -- pre-keys / session keys
  updated_at timestamptz not null default now()
);

-- Contactos
create table crm_marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  phone text not null,
  name text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);
create index on crm_marketing_contacts (company_id);
create index on crm_marketing_contacts using gin (tags);

-- CampaÃ±as
create table crm_wa_campaigns (
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

-- Cola de envÃ­o
create table crm_wa_queue (
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
create index on crm_wa_queue (campaign_id, status);
create index on crm_wa_queue (company_id, status);

-- Habilitar RLS
alter table crm_marketing_contacts enable row level security;
alter table crm_wa_campaigns enable row level security;
alter table crm_wa_queue enable row level security;
alter table wa_sessions enable row level security;
alter table companies enable row level security;
alter table profiles enable row level security;

-- FunciÃ³n helper: company_id del usuario autenticado
create or replace function auth_company_id()
returns uuid language sql stable as $$
  select company_id from profiles where id = auth.uid()
$$;

-- PolÃ­ticas para crm_marketing_contacts
create policy "tenant_isolation_select" on crm_marketing_contacts
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all" on crm_marketing_contacts
  for all using (company_id = auth_company_id());

-- PolÃ­ticas para crm_wa_campaigns
create policy "tenant_isolation_select_camp" on crm_wa_campaigns
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all_camp" on crm_wa_campaigns
  for all using (company_id = auth_company_id());

-- PolÃ­ticas para crm_wa_queue
create policy "tenant_isolation_select_queue" on crm_wa_queue
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all_queue" on crm_wa_queue
  for all using (company_id = auth_company_id());

-- PolÃ­ticas para wa_sessions
create policy "tenant_isolation_select_sessions" on wa_sessions
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all_sessions" on wa_sessions
  for all using (company_id = auth_company_id());

-- PolÃ­ticas para profiles
create policy "profiles_self_select" on profiles
  for select using (id = auth.uid());

-- PolÃ­ticas para companies
create policy "companies_tenant_select" on companies
  for select using (id = auth_company_id());

-- Permitir a usuarios anÃ³nimos o nuevos leer temporalmente si hace falta (o dejar asÃ­ para admin)
-- Migration for adding settings column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
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

    -- Insertar la campaÃ±a
    INSERT INTO crm_wa_campaigns (company_id, name, message_template, status, total_contacts)
    VALUES (v_company_id, p_name, 'Sequence', 'running', 0)
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

    UPDATE crm_wa_campaigns SET total_contacts = v_queued_items WHERE id = v_campaign_id;

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
    SET sent_count = sent_count + 1,
        status = CASE WHEN sent_count + 1 + failed_count >= total_contacts THEN 'completed' ELSE status END
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_failed(p_campaign_id uuid) RETURNS void AS $$
BEGIN
    UPDATE crm_wa_campaigns
    SET failed_count = failed_count + 1,
        status = CASE WHEN sent_count + failed_count + 1 >= total_contacts THEN 'completed' ELSE status END
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER TABLE wa_sessions 
ADD COLUMN IF NOT EXISTS bb_project_id text,
ADD COLUMN IF NOT EXISTS bb_host text;
-- Add UPDATE policy for companies
create policy "companies_tenant_update" on companies
  for update using (id = auth_company_id());
-- Create a stable function to search contacts that works seamlessly with RLS and PostgREST range/count
create or replace function search_contacts(search_term text)
returns setof crm_marketing_contacts
language sql
stable
as $$
  select *
  from crm_marketing_contacts
  where
    phone ilike '%' || search_term || '%'
    or name ilike '%' || search_term || '%'
    or array_to_string(tags, ', ') ilike '%' || search_term || '%';
$$;
-- Add unique constraint for company_id and phone in marketing contacts
ALTER TABLE crm_marketing_contacts ADD CONSTRAINT uq_company_phone UNIQUE (company_id, phone);
-- Migrate RLS to Select Only for Tenant Safety
DROP POLICY IF EXISTS "tenant_isolation_all" ON crm_marketing_contacts;
DROP POLICY IF EXISTS "tenant_isolation_all_camp" ON crm_wa_campaigns;
DROP POLICY IF EXISTS "tenant_isolation_all_queue" ON crm_wa_queue;

-- Add scheduled_for to queue for Anti-Ban Delays
ALTER TABLE crm_wa_queue ADD COLUMN scheduled_for timestamptz DEFAULT now();
CREATE INDEX idx_crm_wa_queue_scheduled ON crm_wa_queue (scheduled_for) WHERE status = 'pendiente';

-- Add min and max delay settings to campaigns
ALTER TABLE crm_wa_campaigns ADD COLUMN min_delay_sec int DEFAULT 45;
ALTER TABLE crm_wa_campaigns ADD COLUMN max_delay_sec int DEFAULT 90;
-- Update campaigns table to properly store the sequence
ALTER TABLE crm_wa_campaigns ADD COLUMN sequence jsonb;

-- rpc_create_campaign
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
    v_campaign_id uuid;
    v_queued_items int := 0;
    seq_step jsonb;
    contact_rec record;
    current_delay_sec int := 0;
    step_delay int;
    random_extra_delay int;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Basic Validation
    IF p_min_delay_sec < 10 THEN
        RAISE EXCEPTION 'El delay mÃ­nimo no puede ser menor a 10 segundos para evitar baneos.';
    END IF;

    -- Insertar la campaÃ±a
    INSERT INTO crm_wa_campaigns (company_id, name, message_template, sequence, min_delay_sec, max_delay_sec, status, total_contacts)
    VALUES (v_company_id, p_name, 'Sequence (Backend Resolved)', p_sequence, p_min_delay_sec, p_max_delay_sec, 'running', 0)
    RETURNING id INTO v_campaign_id;

    -- Iterar sobre contactos basados en el tag directamente en backend
    FOR contact_rec IN 
        SELECT id, phone, name 
        FROM crm_marketing_contacts 
        WHERE company_id = v_company_id 
          AND (p_target_tag = '' OR p_target_tag = ANY(tags))
    LOOP
        current_delay_sec := 0;

        -- Por cada contacto, iteramos la secuencia de mensajes
        FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence)
        LOOP
            -- Random delay anti ban between min and max
            random_extra_delay := floor(random() * (p_max_delay_sec - p_min_delay_sec + 1))::int + p_min_delay_sec;
            
            -- Combine base delay from sequence step with random extra delay
            step_delay := COALESCE((seq_step->>'delayAfterMs')::int / 1000, 0) + random_extra_delay;
            current_delay_sec := current_delay_sec + step_delay;

            INSERT INTO crm_wa_queue (
                company_id, campaign_id, contact_id, phone, message, status, scheduled_for
            )
            VALUES (
                v_company_id, 
                v_campaign_id, 
                contact_rec.id,
                contact_rec.phone, 
                -- We store the raw content. The cron will resolve Spintax and variables
                seq_step->>'content',
                'pendiente',
                now() + (current_delay_sec || ' seconds')::interval
            );
            v_queued_items := v_queued_items + 1;
        END LOOP;
    END LOOP;

    UPDATE crm_wa_campaigns SET total_contacts = v_queued_items WHERE id = v_campaign_id;

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', v_campaign_id,
        'queued_items', v_queued_items
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure other functions are secure
CREATE OR REPLACE FUNCTION rpc_cancel_campaign(p_campaign_id uuid) RETURNS jsonb 
SET search_path = public, pg_temp
AS $$
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
-- Add independent clocks to wa_sessions
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS next_allowed_send_at timestamptz;
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS last_message_sent_at timestamptz;

-- Revert the scheduled_for assignment in rpc_create_campaign since delays will be resolved at send-time
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
    v_campaign_id uuid;
    v_queued_items int := 0;
    seq_step jsonb;
    contact_rec record;
BEGIN
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Basic Validation
    IF p_min_delay_sec < 10 THEN
        RAISE EXCEPTION 'El delay mÃ­nimo no puede ser menor a 10 segundos para evitar baneos.';
    END IF;

    -- Insertar la campaÃ±a
    INSERT INTO crm_wa_campaigns (company_id, name, message_template, sequence, min_delay_sec, max_delay_sec, status, total_contacts)
    VALUES (v_company_id, p_name, 'Sequence (Backend Resolved)', p_sequence, p_min_delay_sec, p_max_delay_sec, 'running', 0)
    RETURNING id INTO v_campaign_id;

    -- Iterar sobre contactos basados en el tag directamente en backend
    FOR contact_rec IN 
        SELECT id, phone, name 
        FROM crm_marketing_contacts 
        WHERE company_id = v_company_id 
          AND (p_target_tag = '' OR p_target_tag = ANY(tags))
    LOOP
        -- Por cada contacto, iteramos la secuencia de mensajes
        FOR seq_step IN SELECT * FROM jsonb_array_elements(p_sequence)
        LOOP
            INSERT INTO crm_wa_queue (
                company_id, campaign_id, contact_id, phone, message, status, scheduled_for
            )
            VALUES (
                v_company_id, 
                v_campaign_id, 
                contact_rec.id,
                contact_rec.phone, 
                seq_step->>'content',
                'pendiente',
                now() -- Los mensajes ya no pre-calculan su futuro. El reloj de sesiÃ³n decide cuÃ¡ndo salen.
            );
            v_queued_items := v_queued_items + 1;
        END LOOP;
    END LOOP;

    UPDATE crm_wa_campaigns SET total_contacts = v_queued_items WHERE id = v_campaign_id;

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', v_campaign_id,
        'queued_items', v_queued_items
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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

    -- Validar que la empresa estÃ© activa
    SELECT status INTO v_company_status FROM companies WHERE id = v_company_id;
    IF v_company_status IS NULL OR v_company_status != 'activa' THEN
        RAISE EXCEPTION 'La empresa no se encuentra activa.';
    END IF;

    IF p_min_delay_sec < 10 THEN
        RAISE EXCEPTION 'El delay mÃ­nimo no puede ser menor a 10 segundos para evitar baneos.';
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
        RAISE EXCEPTION 'El lÃ­mite es de 1000 contactos por lote.';
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
-- 1. Actualizar wa_sessions para Warm-up y Freno AutomÃ¡tico
ALTER TABLE wa_sessions 
ADD COLUMN IF NOT EXISTS connection_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_errors INTEGER DEFAULT 0;

-- 2. Asegurar campos en crm_wa_campaigns y crm_marketing_contacts
ALTER TABLE crm_wa_campaigns ADD COLUMN IF NOT EXISTS sequence jsonb;
ALTER TABLE crm_wa_campaigns ADD COLUMN IF NOT EXISTS min_delay_sec int DEFAULT 45;
ALTER TABLE crm_wa_campaigns ADD COLUMN IF NOT EXISTS max_delay_sec int DEFAULT 90;

ALTER TABLE crm_wa_queue ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_crm_wa_queue_scheduled ON crm_wa_queue (scheduled_for) WHERE status = 'pendiente';

ALTER TABLE crm_marketing_contacts 
ADD COLUMN IF NOT EXISTS opt_in_source VARCHAR(255);

-- 3. Actualizar RPC rpc_upsert_marketing_contact
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[]);
DROP FUNCTION IF EXISTS rpc_upsert_marketing_contact(text, text, text[], text);

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
DROP FUNCTION IF EXISTS rpc_batch_insert_marketing_contacts(jsonb);
DROP FUNCTION IF EXISTS rpc_batch_insert_marketing_contacts(uuid, jsonb);

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
  -- Verificar lÃ­mite de seguridad (evitar sobrecarga y abusos)
  IF jsonb_array_length(p_contacts) > 1000 THEN
    RAISE EXCEPTION 'El lÃ­mite por lote es de 1000 contactos.';
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- 2. Procesar cada contacto en el JSON array
  FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_phone := v_contact->>'phone';
    v_name := v_contact->>'name';
    v_opt_in_source := v_contact->>'opt_in_source';

    -- Limpiar espacios o vacÃ­os del array JSON de tags
    SELECT array_agg(trim(tag::text, '"')) INTO v_tags
    FROM jsonb_array_elements(v_contact->'tags') AS tag
    WHERE trim(tag::text, '"') != '';

    IF v_tags IS NULL THEN
      v_tags := ARRAY[]::TEXT[];
    END IF;

    IF v_phone IS NULL OR v_phone = '' THEN
      CONTINUE; -- Saltar contactos sin telÃ©fono vÃ¡lido
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
-- MigraciÃ³n: Suscripciones y FacturaciÃ³n para Empresas (Tenants)
-- AÃ±ade tipo de plan, fecha de inicio y fin de suscripciÃ³n a la tabla de companies.

-- 1. AÃ±adir campos a la tabla 'companies'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'prueba'; 
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_start_at timestamptz DEFAULT now();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end_at timestamptz DEFAULT (now() + interval '3 days');

-- 2. Asegurarnos que todos los existentes tengan una fecha vÃ¡lida si eran nulos
UPDATE companies 
SET 
  subscription_start_at = created_at,
  subscription_end_at = created_at + interval '1 year' -- Los tenants existentes tendrÃ¡n 1 aÃ±o de gracia por defecto, el admin puede ajustarlos.
WHERE subscription_end_at IS NULL;

-- 3. Restringir actualizaciones a los administradores
-- (Ya tenÃ­amos RLS configurada. Asegurarnos que un tenant no pueda actualizar 'subscription_end_at')
-- Esto se maneja automÃ¡ticamente si las actualizaciones a 'companies' se hacen solo desde el panel Admin usando Service Role Key.
-- O bien, creamos una polÃ­tica especÃ­fica si fuera necesario (opcional).

-- Refrescar la cachÃ© de schema de PostgREST
NOTIFY pgrst, 'reload schema';
-- Agregar tracking de respuestas a las campaÃ±as
alter table crm_wa_campaigns
add column replied_count int default 0;

-- Agregar tracking individual de mensaje en cola
alter table crm_wa_queue
add column replied boolean default false;

-- Ãndice para bÃºsquedas rÃ¡pidas en webhooks
-- Queremos buscar rÃ¡pidamente por `company_id` y `phone` ordenado por `sent_at` descendente
create index if not exists crm_wa_queue_company_phone_sent_idx on crm_wa_queue (company_id, phone, sent_at desc);
