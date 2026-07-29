begin;

-- Demo tenants are disposable sandboxes. Business records may change inside
-- their isolated tenant, while any external WhatsApp side effect stays blocked.
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
    if pg_catalog.to_regclass('public.' || v_table) is not null then
      execute pg_catalog.format(
        'drop trigger if exists enforce_demo_read_only on public.%I',
        v_table
      );
    end if;
  end loop;
end;
$block$;

drop function if exists public.enforce_demo_read_only();

create or replace function public.suppress_demo_external_side_effect()
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
    -- Returning NULL from a BEFORE trigger safely turns the attempted external
    -- side effect into a no-op without rolling back the sandbox interaction.
    return null;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function public.suppress_demo_external_side_effect()
  from public, anon, authenticated;

drop trigger if exists suppress_demo_external_side_effect
  on public.crm_wa_queue;
create trigger suppress_demo_external_side_effect
before insert or update or delete on public.crm_wa_queue
for each row execute function public.suppress_demo_external_side_effect();

drop trigger if exists suppress_demo_external_side_effect
  on public.wa_sessions;
create trigger suppress_demo_external_side_effect
before insert or update or delete on public.wa_sessions
for each row execute function public.suppress_demo_external_side_effect();

alter table public.demo_leads
  add column if not exists info_queue_id uuid
    references public.crm_wa_queue(id) on delete set null,
  add column if not exists follow_up_queue_id uuid
    references public.crm_wa_queue(id) on delete set null,
  add column if not exists lead_status text not null default 'demo',
  add column if not exists converted_at timestamptz;

alter table public.demo_leads
  drop constraint if exists demo_leads_status_check;
alter table public.demo_leads
  add constraint demo_leads_status_check
  check (lead_status in ('demo', 'client', 'declined'));

create index if not exists demo_leads_status_created_at_idx
  on public.demo_leads (lead_status, created_at desc);

create table if not exists public.demo_message_templates (
  template_key text primary key,
  message_template text not null,
  delay_seconds integer not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint demo_message_templates_key_check
    check (template_key in ('immediate_info', 'day_five_follow_up')),
  constraint demo_message_templates_content_check
    check (char_length(btrim(message_template)) between 20 and 1200),
  constraint demo_message_templates_delay_check
    check (delay_seconds between 0 and 2592000)
);

alter table public.demo_message_templates enable row level security;
revoke all on table public.demo_message_templates from public, anon, authenticated;
grant select, insert, update, delete on table public.demo_message_templates to service_role;

insert into public.demo_message_templates (
  template_key,
  message_template,
  delay_seconds,
  enabled
)
values
  (
    'immediate_info',
    '✨ Este mensaje se envió automáticamente. Así funciona Renova: al confirmar un servicio, tu cliente recibe su agradecimiento y, según el seguimiento que configures, otro mensaje días después para saber cómo le fue. También puedes preparar promociones cuando quieras, siempre bajo tu control. 📲',
    8,
    true
  ),
  (
    'day_five_follow_up',
    'Hola {{nombre}} 👋 Hace 5 días probaste Renova CRM para {{negocio}}. ¿Te gustaría usarlo con clientes reales? Actívalo por S/ {{precio_oferta}} al mes durante tus primeros 6 meses (precio regular S/ {{precio_regular}}). Sin permanencia: si no se adapta a tu negocio, nos avisas y cancelamos. Responde a este mensaje y te ayudamos a empezar.',
    432000,
    true
  )
on conflict (template_key) do nothing;

create or replace function public.cancel_demo_follow_up_on_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if old.follow_up_queue_id is not null then
    update public.crm_wa_queue
       set status = 'cancelled',
           last_error_code = 'DEMO_DELETED',
           last_error_at = now()
     where id = old.follow_up_queue_id
       and status in ('queued', 'retry_scheduled', 'leased');
  end if;
  return old;
end;
$function$;

revoke all on function public.cancel_demo_follow_up_on_delete()
  from public, anon, authenticated;

drop trigger if exists cancel_demo_follow_up_on_delete
  on public.demo_leads;
create trigger cancel_demo_follow_up_on_delete
before delete on public.demo_leads
for each row execute function public.cancel_demo_follow_up_on_delete();

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
  v_welcome_queue_id uuid;
  v_info_queue_id uuid;
  v_follow_up_queue_id uuid;
  v_welcome_message text;
  v_info_message text;
  v_follow_up_message text;
  v_info_scheduled_at timestamptz;
  v_follow_up_scheduled_at timestamptz;
  v_info_enabled boolean := true;
  v_follow_up_enabled boolean := true;
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

  if nullif(pg_catalog.btrim(p_business_name), '') is null
     or pg_catalog.char_length(pg_catalog.btrim(p_business_name)) not between 2 and 120 then
    raise exception 'El nombre del negocio no es válido.';
  end if;
  if nullif(pg_catalog.btrim(p_contact_name), '') is null
     or pg_catalog.char_length(pg_catalog.btrim(p_contact_name)) not between 2 and 120 then
    raise exception 'El nombre de contacto no es válido.';
  end if;
  if nullif(pg_catalog.btrim(p_industry), '') is null
     or pg_catalog.char_length(pg_catalog.btrim(p_industry)) not between 2 and 120 then
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
     set name = pg_catalog.btrim(p_business_name),
         settings = coalesce(settings, '{}'::jsonb)
           || pg_catalog.jsonb_build_object(
             'demo_industry', pg_catalog.btrim(p_industry),
             'demo_sandbox', true
           ),
         subscription_end_at = now() + interval '24 hours'
   where id = v_company_id;

  delete from public.wa_sessions
   where company_id = v_company_id;

  insert into public.profiles (id, company_id, role, full_name)
  values (
    p_user_id,
    v_company_id,
    'owner',
    pg_catalog.btrim(p_contact_name)
  )
  on conflict (id) do update
     set company_id = excluded.company_id,
         role = excluded.role,
         full_name = excluded.full_name;

  v_welcome_message := pg_catalog.format(
    'Hola %s 👋 Gracias por visitarnos en %s y realizarte el servicio de laceado brasileño. Estás probando la demo interactiva de Renova CRM.',
    pg_catalog.btrim(p_contact_name),
    pg_catalog.btrim(p_business_name)
  );

  select
    message_template,
    now() + pg_catalog.make_interval(secs => delay_seconds),
    enabled
    into v_info_message, v_info_scheduled_at, v_info_enabled
    from public.demo_message_templates
   where template_key = 'immediate_info';

  select
    message_template,
    now() + pg_catalog.make_interval(secs => delay_seconds),
    enabled
    into v_follow_up_message, v_follow_up_scheduled_at, v_follow_up_enabled
    from public.demo_message_templates
   where template_key = 'day_five_follow_up';

  v_info_message := pg_catalog.replace(
    pg_catalog.replace(
      coalesce(v_info_message, ''),
      '{{nombre}}',
      pg_catalog.btrim(p_contact_name)
    ),
    '{{negocio}}',
    pg_catalog.btrim(p_business_name)
  );

  v_follow_up_message := pg_catalog.replace(
    pg_catalog.replace(
      pg_catalog.replace(
        pg_catalog.replace(
          coalesce(v_follow_up_message, ''),
          '{{nombre}}',
          pg_catalog.btrim(p_contact_name)
        ),
        '{{negocio}}',
        pg_catalog.btrim(p_business_name)
      ),
      '{{precio_oferta}}',
      '99'
    ),
    '{{precio_regular}}',
    '159'
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
    v_welcome_message,
    'queued',
    now(),
    now(),
    'demo-welcome:' || v_company_id::text,
    'transactional',
    250
  )
  returning id into v_welcome_queue_id;

  if v_info_enabled and nullif(pg_catalog.btrim(v_info_message), '') is not null then
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
      v_info_message,
      'queued',
      v_info_scheduled_at,
      v_info_scheduled_at,
      'demo-info:' || v_company_id::text,
      'transactional',
      245
    )
    returning id into v_info_queue_id;
  end if;

  if v_follow_up_enabled and nullif(pg_catalog.btrim(v_follow_up_message), '') is not null then
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
      v_follow_up_message,
      'queued',
      v_follow_up_scheduled_at,
      v_follow_up_scheduled_at,
      'demo-follow-up:' || v_company_id::text,
      'transactional',
      180
    )
    returning id into v_follow_up_queue_id;
  end if;

  insert into public.demo_leads (
    company_id,
    auth_user_id,
    business_name,
    contact_name,
    phone,
    industry,
    whatsapp_consent,
    whatsapp_consented_at,
    welcome_queue_id,
    info_queue_id,
    follow_up_queue_id,
    lead_status
  )
  values (
    v_company_id,
    p_user_id,
    pg_catalog.btrim(p_business_name),
    pg_catalog.btrim(p_contact_name),
    v_phone,
    pg_catalog.btrim(p_industry),
    true,
    now(),
    v_welcome_queue_id,
    v_info_queue_id,
    v_follow_up_queue_id,
    'demo'
  );

  return pg_catalog.jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'welcome_queued', true,
    'messages_queued', 1 + case when v_info_queue_id is null then 0 else 1 end,
    'follow_up_scheduled_for', v_follow_up_scheduled_at
  );
end;
$function$;

revoke all on function public.rpc_create_demo_from_lead(
  uuid, uuid, text, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.rpc_create_demo_from_lead(
  uuid, uuid, text, text, text, text, boolean
) to service_role;

create or replace function public.rpc_set_demo_lead_status(
  p_company_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_follow_up_queue_id uuid;
begin
  if p_status not in ('demo', 'client', 'declined') then
    raise exception 'Estado comercial no válido.'
      using errcode = '22023';
  end if;

  select follow_up_queue_id
    into v_follow_up_queue_id
    from public.demo_leads
   where company_id = p_company_id
   for update;

  if not found then
    raise exception 'Lead demo no encontrado.'
      using errcode = 'P0002';
  end if;

  update public.demo_leads
     set lead_status = p_status,
         converted_at = case when p_status = 'client' then now() else null end
   where company_id = p_company_id;

  if p_status in ('client', 'declined') and v_follow_up_queue_id is not null then
    update public.crm_wa_queue
       set status = 'cancelled',
           last_error_code = case
             when p_status = 'client' then 'LEAD_CONVERTED'
             else 'LEAD_DECLINED'
           end,
           last_error_at = now()
     where id = v_follow_up_queue_id
       and status in ('queued', 'retry_scheduled', 'leased');
  elsif p_status = 'demo' and v_follow_up_queue_id is not null then
    update public.crm_wa_queue
       set status = 'queued',
           last_error_code = null,
           last_error_at = null,
           next_attempt_at = greatest(scheduled_for, now())
     where id = v_follow_up_queue_id
       and status = 'cancelled'
       and scheduled_for > now();
  end if;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'status', p_status,
    'follow_up_cancelled', p_status in ('client', 'declined')
  );
end;
$function$;

revoke all on function public.rpc_set_demo_lead_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.rpc_set_demo_lead_status(uuid, text)
  to service_role;

-- Access still expires after 24 hours, but the isolated sandbox is retained
-- for seven days so the owner can classify the lead before the day-five follow-up.
create or replace function public.rpc_cleanup_demo_companies()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted_count integer;
begin
  delete from public.companies
   where is_demo is true
     and created_at < now() - interval '7 days';

  get diagnostics v_deleted_count = row_count;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'deleted_demos', v_deleted_count
  );
end;
$function$;

revoke all on function public.rpc_cleanup_demo_companies()
  from public, anon, authenticated;
grant execute on function public.rpc_cleanup_demo_companies()
  to service_role;

-- Correct pending demo messages created by the previous template.
update public.crm_wa_queue
   set message = pg_catalog.replace(
     pg_catalog.replace(message, 'Laciado brasilero', 'laceado brasileño'),
     'versión demo de Renova CRM',
     'demo interactiva de Renova CRM'
   )
 where idempotency_key like 'demo-welcome:%'
   and status in ('queued', 'retry_scheduled');

commit;
