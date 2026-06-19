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

-- Sesión de WhatsApp por empresa
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

-- Campañas
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

-- Cola de envío
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

-- Función helper: company_id del usuario autenticado
create or replace function auth_company_id()
returns uuid language sql stable as $$
  select company_id from profiles where id = auth.uid()
$$;

-- Políticas para crm_marketing_contacts
create policy "tenant_isolation_select" on crm_marketing_contacts
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all" on crm_marketing_contacts
  for all using (company_id = auth_company_id());

-- Políticas para crm_wa_campaigns
create policy "tenant_isolation_select_camp" on crm_wa_campaigns
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all_camp" on crm_wa_campaigns
  for all using (company_id = auth_company_id());

-- Políticas para crm_wa_queue
create policy "tenant_isolation_select_queue" on crm_wa_queue
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all_queue" on crm_wa_queue
  for all using (company_id = auth_company_id());

-- Políticas para wa_sessions
create policy "tenant_isolation_select_sessions" on wa_sessions
  for select using (company_id = auth_company_id());
create policy "tenant_isolation_all_sessions" on wa_sessions
  for all using (company_id = auth_company_id());

-- Políticas para profiles
create policy "profiles_self_select" on profiles
  for select using (id = auth.uid());

-- Políticas para companies
create policy "companies_tenant_select" on companies
  for select using (id = auth_company_id());

-- Permitir a usuarios anónimos o nuevos leer temporalmente si hace falta (o dejar así para admin)
