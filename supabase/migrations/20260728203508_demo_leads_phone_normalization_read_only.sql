begin;

-- Canonical Peruvian WhatsApp format: country code 51 + 9-digit mobile.
create or replace function public.normalize_peru_phone(p_phone text)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $function$
declare
  v_digits text := pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
begin
  if v_digits like '00%' then
    v_digits := pg_catalog.substr(v_digits, 3);
  end if;

  if pg_catalog.char_length(v_digits) = 12 and v_digits like '0519%' then
    v_digits := pg_catalog.substr(v_digits, 2);
  end if;

  if pg_catalog.char_length(v_digits) = 9 and v_digits like '9%' then
    return '51' || v_digits;
  end if;

  if pg_catalog.char_length(v_digits) = 11 and v_digits like '519%' then
    return v_digits;
  end if;

  raise exception 'Número peruano inválido. Ingresa 9 dígitos, por ejemplo 996 552 871.'
    using errcode = '22023';
end;
$function$;

revoke all on function public.normalize_peru_phone(text) from public, anon;
grant execute on function public.normalize_peru_phone(text) to authenticated, service_role;

create or replace function public.normalize_peru_phone_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.phone := public.normalize_peru_phone(new.phone);
  return new;
end;
$function$;

revoke all on function public.normalize_peru_phone_columns() from public, anon, authenticated;

drop trigger if exists crm_contacts_normalize_peru_phone
  on public.crm_marketing_contacts;
create trigger crm_contacts_normalize_peru_phone
before insert or update of phone on public.crm_marketing_contacts
for each row execute function public.normalize_peru_phone_columns();

drop trigger if exists crm_queue_normalize_peru_phone
  on public.crm_wa_queue;
create trigger crm_queue_normalize_peru_phone
before insert or update of phone on public.crm_wa_queue
for each row execute function public.normalize_peru_phone_columns();

-- Pending messages created before this migration also receive the provider-ready format.
update public.crm_wa_queue
set phone = public.normalize_peru_phone(phone)
where status in ('pendiente', 'queued', 'retry_scheduled')
  and (
    pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g') ~ '^9[0-9]{8}$'
    or pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g') ~ '^519[0-9]{8}$'
  );

create table public.demo_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique
    references public.companies(id) on delete cascade,
  auth_user_id uuid not null unique
    references auth.users(id) on delete cascade,
  business_name text not null,
  contact_name text not null,
  phone text not null,
  industry text not null,
  whatsapp_consent boolean not null default false,
  whatsapp_consented_at timestamptz,
  welcome_queue_id uuid
    references public.crm_wa_queue(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint demo_leads_business_name_length
    check (char_length(btrim(business_name)) between 2 and 120),
  constraint demo_leads_contact_name_length
    check (char_length(btrim(contact_name)) between 2 and 120),
  constraint demo_leads_industry_length
    check (char_length(btrim(industry)) between 2 and 120),
  constraint demo_leads_phone_canonical
    check (phone ~ '^519[0-9]{8}$'),
  constraint demo_leads_consent_timestamp
    check (
      (whatsapp_consent and whatsapp_consented_at is not null)
      or (not whatsapp_consent and whatsapp_consented_at is null)
    )
);

create index demo_leads_created_at_idx
  on public.demo_leads (created_at desc);
create index demo_leads_phone_created_at_idx
  on public.demo_leads (phone, created_at desc);

alter table public.demo_leads enable row level security;
revoke all on table public.demo_leads from public, anon, authenticated;
grant select, insert, update, delete on table public.demo_leads to service_role;

-- Anonymous users use PostgreSQL's authenticated role in Supabase. This
-- trigger is therefore the final write boundary for demos, including calls
-- made through SECURITY DEFINER business RPCs.
create or replace function public.enforce_demo_read_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_is_anonymous boolean :=
    coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false);
  v_is_demo boolean := false;
begin
  if v_user_id is not null then
    select coalesce(c.is_demo, false)
      into v_is_demo
      from public.profiles p
      join public.companies c on c.id = p.company_id
     where p.id = v_user_id;
  end if;

  if v_is_anonymous or coalesce(v_is_demo, false) then
    raise exception 'La vista demo es de solo lectura.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_demo_read_only()
  from public, anon, authenticated;

do $block$
declare
  v_table text;
begin
  foreach v_table in array array[
    'companies',
    'profiles',
    'wa_sessions',
    'crm_marketing_contacts',
    'crm_wa_campaigns',
    'crm_wa_queue',
    'spa_services',
    'spa_staff',
    'spa_staff_services',
    'spa_products',
    'spa_visits',
    'spa_payments',
    'spa_follow_ups',
    'spa_staff_schedules',
    'spa_staff_blocks',
    'spa_visit_events'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format(
        'drop trigger if exists enforce_demo_read_only on public.%I',
        v_table
      );
      execute format(
        'create trigger enforce_demo_read_only before insert or update or delete on public.%I for each row execute function public.enforce_demo_read_only()',
        v_table
      );
    end if;
  end loop;
end;
$block$;

create or replace function public.rpc_create_demo_from_lead(
  p_template_company_id uuid,
  p_user_id uuid,
  p_business_name text,
  p_contact_name text,
  p_phone text,
  p_industry text,
  p_whatsapp_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_clone jsonb;
  v_company_id uuid;
  v_phone text;
  v_queue_id uuid;
  v_message text;
begin
  if not exists (
    select 1
    from auth.users
    where id = p_user_id
      and is_anonymous is true
  ) then
    raise exception 'La demo requiere un usuario anónimo válido.'
      using errcode = '42501';
  end if;

  if nullif(btrim(p_business_name), '') is null
     or char_length(btrim(p_business_name)) not between 2 and 120 then
    raise exception 'El nombre del negocio no es válido.';
  end if;
  if nullif(btrim(p_contact_name), '') is null
     or char_length(btrim(p_contact_name)) not between 2 and 120 then
    raise exception 'El nombre de contacto no es válido.';
  end if;
  if nullif(btrim(p_industry), '') is null
     or char_length(btrim(p_industry)) not between 2 and 120 then
    raise exception 'El rubro no es válido.';
  end if;
  if not p_whatsapp_consent then
    raise exception 'Debes autorizar el mensaje de demostración por WhatsApp.';
  end if;

  v_phone := public.normalize_peru_phone(p_phone);

  if exists (
    select 1
    from public.demo_leads
    where phone = v_phone
      and created_at > now() - interval '24 hours'
  ) then
    raise exception 'Este número ya solicitó una demo durante las últimas 24 horas.'
      using errcode = 'P0001';
  end if;

  select public.rpc_clone_demo_company(p_template_company_id)
    into v_clone;
  v_company_id := (v_clone->>'new_company_id')::uuid;

  if v_company_id is null then
    raise exception 'No se pudo crear la empresa demo.';
  end if;

  update public.companies
  set name = btrim(p_business_name),
      settings = coalesce(settings, '{}'::jsonb)
        || jsonb_build_object(
          'demo_industry', btrim(p_industry),
          'demo_read_only', true
        ),
      subscription_end_at = now() + interval '24 hours'
  where id = v_company_id;

  -- The demo is read-only and must not own or expose a WhatsApp connection.
  -- Its welcome message is sent through the controlled template sender below.
  delete from public.wa_sessions
  where company_id = v_company_id;

  insert into public.profiles (id, company_id, role, full_name)
  values (p_user_id, v_company_id, 'owner', btrim(p_contact_name))
  on conflict (id) do update
  set company_id = excluded.company_id,
      role = excluded.role,
      full_name = excluded.full_name;

  v_message := format(
    'Hola %s, gracias por visitarnos en %s y realizarte el servicio de Laciado brasilero. Estás probando la versión demo de Renova CRM.',
    btrim(p_contact_name),
    btrim(p_business_name)
  );

  insert into public.crm_wa_queue (
    company_id,
    phone,
    message,
    status,
    scheduled_for,
    next_attempt_at,
    idempotency_key,
    message_type,
    priority
  )
  values (
    p_template_company_id,
    v_phone,
    v_message,
    'queued',
    now(),
    now(),
    'demo-welcome:' || v_company_id::text,
    'transactional',
    250
  )
  returning id into v_queue_id;

  insert into public.demo_leads (
    company_id,
    auth_user_id,
    business_name,
    contact_name,
    phone,
    industry,
    whatsapp_consent,
    whatsapp_consented_at,
    welcome_queue_id
  )
  values (
    v_company_id,
    p_user_id,
    btrim(p_business_name),
    btrim(p_contact_name),
    v_phone,
    btrim(p_industry),
    true,
    now(),
    v_queue_id
  );

  return jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'welcome_queued', true
  );
end;
$function$;

revoke all on function public.rpc_create_demo_from_lead(
  uuid, uuid, text, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.rpc_create_demo_from_lead(
  uuid, uuid, text, text, text, text, boolean
) to service_role;

commit;
