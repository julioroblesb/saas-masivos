alter table public.spa_payments
  add column source text not null default 'manual',
  add column idempotency_key text;

alter table public.spa_payments
  add constraint spa_payments_source_check
    check (source in ('manual', 'visit_completion', 'import')),
  add constraint spa_payments_idempotency_key_check
    check (idempotency_key is null or char_length(idempotency_key) between 1 and 200);

create unique index spa_payments_company_idempotency_key_idx
  on public.spa_payments (company_id, idempotency_key)
  where idempotency_key is not null;

create table public.spa_visit_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  visit_id uuid not null,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint spa_visit_events_visit_tenant_fkey
    foreign key (visit_id, company_id)
    references public.spa_visits(id, company_id)
    on delete cascade,
  constraint spa_visit_events_type_check
    check (event_type in ('completed', 'cancelled', 'no_show', 'payment_added')),
  constraint spa_visit_events_visit_event_key
    unique (visit_id, event_type)
);

create index spa_visit_events_company_created_idx
  on public.spa_visit_events (company_id, created_at desc);

alter table public.spa_visit_events enable row level security;
revoke all on table public.spa_visit_events from public, anon, authenticated;
revoke all on sequence public.spa_visit_events_id_seq from public, anon, authenticated;
grant select, insert on table public.spa_visit_events to service_role;
grant usage, select on sequence public.spa_visit_events_id_seq to service_role;

drop function if exists public.rpc_complete_visit(uuid);

create or replace function public.rpc_complete_visit(
  p_visit_id uuid,
  p_payment_method text default null,
  p_is_credit boolean default false,
  p_initial_payment numeric default 0,
  p_debt_due_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_visit public.spa_visits%rowtype;
  v_contact public.crm_marketing_contacts%rowtype;
  v_service public.spa_services%rowtype;
  v_settings jsonb;
  v_auto jsonb;
  v_total_paid numeric;
  v_payment_status text;
  v_debt_due_date date;
  v_messages_queued integer := 0;
  v_name text;
  v_care_template text;
  v_instructions_template text;
  v_followup_template text;
  v_message text;
  v_scheduled_at timestamptz;
  v_care_enabled boolean;
  v_followup_enabled boolean;
begin
  if v_actor_id is null then raise exception 'Not authenticated'; end if;

  select company_id into v_company_id
    from public.profiles
   where id = v_actor_id;
  if v_company_id is null then raise exception 'Not authorized'; end if;
  if p_initial_payment < 0 then raise exception 'El abono no puede ser negativo'; end if;
  if p_initial_payment > 0 and nullif(trim(p_payment_method), '') is null then
    raise exception 'El método de pago es obligatorio';
  end if;

  select *
    into v_visit
    from public.spa_visits
   where id = p_visit_id
     and company_id = v_company_id
   for update;
  if not found then raise exception 'Atención no encontrada'; end if;
  if v_visit.status in ('cancelado', 'no_asistio') then
    raise exception 'No se puede completar una atención cancelada';
  end if;

  select * into v_contact
    from public.crm_marketing_contacts
   where id = v_visit.contact_id
     and company_id = v_company_id;
  if not found then raise exception 'Contacto no encontrado'; end if;

  select * into v_service
    from public.spa_services
   where id = v_visit.service_id
     and company_id = v_company_id;
  if not found then raise exception 'Servicio no encontrado'; end if;

  if p_initial_payment > coalesce(v_visit.price_charged, 0) then
    raise exception 'El abono excede el precio de la atención';
  end if;

  if p_initial_payment > 0 then
    insert into public.spa_payments (
      company_id,
      visit_id,
      amount,
      payment_method,
      payment_date,
      notes,
      source,
      idempotency_key
    )
    values (
      v_company_id,
      p_visit_id,
      p_initial_payment,
      trim(p_payment_method),
      now(),
      nullif(trim(p_notes), ''),
      'visit_completion',
      'visit:' || p_visit_id::text || ':completion'
    )
    on conflict (company_id, idempotency_key)
      where idempotency_key is not null
    do nothing;
  end if;

  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.spa_payments
   where visit_id = p_visit_id
     and company_id = v_company_id;

  v_payment_status := case
    when v_total_paid >= coalesce(v_visit.price_charged, 0) then 'pagado'
    when v_total_paid > 0 then 'parcial'
    else 'pendiente'
  end;
  v_debt_due_date := case
    when p_is_credit and v_payment_status <> 'pagado' then p_debt_due_date
    else null
  end;
  if p_is_credit and v_payment_status <> 'pagado' and v_debt_due_date is null then
    raise exception 'La fecha de deuda es obligatoria';
  end if;

  update public.spa_visits
     set status = 'completado',
         completed_at = coalesce(completed_at, now()),
         payment_status = v_payment_status,
         debt_due_date = v_debt_due_date,
         notes = coalesce(nullif(trim(p_notes), ''), notes)
   where id = p_visit_id;

  update public.crm_marketing_contacts contact
     set total_visits = metrics.total_visits,
         total_spent = metrics.total_spent,
         last_visit_date = metrics.last_visit_date,
         updated_at = now()
    from (
      select count(*)::integer as total_visits,
             coalesce(sum(price_charged), 0) as total_spent,
             max(coalesce(completed_at, visit_date, scheduled_date)) as last_visit_date
        from public.spa_visits
       where contact_id = v_visit.contact_id
         and company_id = v_company_id
         and status = 'completado'
    ) metrics
   where contact.id = v_visit.contact_id
     and contact.company_id = v_company_id;

  perform public.rpc_recalculate_customer_segment(v_visit.contact_id);

  select settings into v_settings
    from public.companies
   where id = v_company_id;
  v_auto := coalesce(v_settings->'auto_messages', '{}'::jsonb);
  v_care_enabled := case lower(coalesce(v_auto->>'careEnabled', 'true'))
    when 'false' then false else true end;
  v_followup_enabled := case lower(coalesce(v_auto->>'followUpEnabled', 'true'))
    when 'false' then false else true end;
  v_name := coalesce(nullif(trim(v_contact.name), ''), 'cliente');

  if v_contact.phone is not null and trim(v_contact.phone) <> '' then
    v_care_template := coalesce(
      nullif(v_auto->>'careTemplate', ''),
      'Hola {{nombre}}, gracias por visitarnos hoy. Esperamos que hayas disfrutado tu servicio de {{servicio}}.'
    );
    v_instructions_template := coalesce(
      nullif(v_auto->>'careInstructionsTemplate', ''),
      'Cuidados para {{servicio}}: {{cuidados}}'
    );
    v_followup_template := coalesce(
      nullif(v_auto->>'followUpTemplate', ''),
      'Hola {{nombre}}, ¿cómo sigues después de tu servicio de {{servicio}} hace {{dias}} días?'
    );

    if v_care_enabled then
      v_message := replace(replace(v_care_template, '{{nombre}}', v_name), '{{servicio}}', v_service.name);
      insert into public.crm_wa_queue (
        company_id, visit_id, contact_id, phone, message, status,
        scheduled_for, next_attempt_at, idempotency_key, message_type, priority
      )
      values (
        v_company_id, p_visit_id, v_contact.id,
        regexp_replace(v_contact.phone, '[^0-9]', '', 'g'),
        v_message, 'queued', now(), now(),
        'visit:' || p_visit_id::text || ':care', 'transactional', 200
      )
      on conflict (company_id, idempotency_key) do nothing;
      get diagnostics v_messages_queued = row_count;

      if nullif(trim(v_service.care_instructions), '') is not null
         or nullif(trim(v_service.care_image_url), '') is not null then
        v_message := replace(
          replace(
            replace(v_instructions_template, '{{nombre}}', v_name),
            '{{servicio}}', v_service.name
          ),
          '{{cuidados}}', coalesce(v_service.care_instructions, '')
        );
        v_scheduled_at := now() + interval '5 seconds';
        insert into public.crm_wa_queue (
          company_id, visit_id, contact_id, phone, message, media_url, status,
          scheduled_for, next_attempt_at, idempotency_key, message_type, priority
        )
        values (
          v_company_id, p_visit_id, v_contact.id,
          regexp_replace(v_contact.phone, '[^0-9]', '', 'g'),
          v_message, v_service.care_image_url, 'queued',
          v_scheduled_at, v_scheduled_at,
          'visit:' || p_visit_id::text || ':care-instructions',
          'transactional', 200
        )
        on conflict (company_id, idempotency_key) do nothing;
        v_messages_queued := v_messages_queued + case when found then 1 else 0 end;
      end if;
    end if;

    if v_followup_enabled and coalesce(v_service.duration_days, 0) > 0 then
      v_message := replace(
        replace(
          replace(v_followup_template, '{{nombre}}', v_name),
          '{{servicio}}', v_service.name
        ),
        '{{dias}}', v_service.duration_days::text
      );
      v_scheduled_at := now() + make_interval(days => v_service.duration_days);
      insert into public.crm_wa_queue (
        company_id, visit_id, contact_id, phone, message, status,
        scheduled_for, next_attempt_at, idempotency_key, message_type, priority
      )
      values (
        v_company_id, p_visit_id, v_contact.id,
        regexp_replace(v_contact.phone, '[^0-9]', '', 'g'),
        v_message, 'queued', v_scheduled_at, v_scheduled_at,
        'visit:' || p_visit_id::text || ':follow-up',
        'transactional', 200
      )
      on conflict (company_id, idempotency_key) do nothing;
      v_messages_queued := v_messages_queued + case when found then 1 else 0 end;
    end if;
  end if;

  insert into public.spa_visit_events (
    company_id, visit_id, event_type, actor_id, payload
  )
  values (
    v_company_id,
    p_visit_id,
    'completed',
    v_actor_id,
    jsonb_build_object(
      'payment_status', v_payment_status,
      'initial_payment', p_initial_payment,
      'messages_queued', v_messages_queued
    )
  )
  on conflict (visit_id, event_type) do nothing;

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id,
    'payment_status', v_payment_status,
    'total_paid', v_total_paid,
    'messages_queued', v_messages_queued
  );
end;
$$;

create or replace function public.rpc_add_visit_payment(
  p_visit_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_price numeric;
  v_total_paid numeric;
  v_payment_status text;
  v_inserted integer := 0;
begin
  if v_actor_id is null then raise exception 'Not authenticated'; end if;
  if p_amount <= 0 then raise exception 'El abono debe ser mayor que cero'; end if;
  if nullif(trim(p_payment_method), '') is null then
    raise exception 'El método de pago es obligatorio';
  end if;
  if char_length(trim(p_idempotency_key)) not between 1 and 200 then
    raise exception 'Clave de idempotencia inválida';
  end if;

  select company_id into v_company_id
    from public.profiles
   where id = v_actor_id;
  if v_company_id is null then raise exception 'Not authorized'; end if;

  select price_charged
    into v_price
    from public.spa_visits
   where id = p_visit_id
     and company_id = v_company_id
   for update;
  if not found then raise exception 'Atención no encontrada'; end if;

  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.spa_payments
   where visit_id = p_visit_id
     and company_id = v_company_id;
  if v_total_paid + p_amount > coalesce(v_price, 0) then
    raise exception 'El abono excede la deuda pendiente';
  end if;

  insert into public.spa_payments (
    company_id, visit_id, amount, payment_method, payment_date,
    source, idempotency_key
  )
  values (
    v_company_id, p_visit_id, p_amount, trim(p_payment_method), now(),
    'manual', trim(p_idempotency_key)
  )
  on conflict (company_id, idempotency_key)
    where idempotency_key is not null
  do nothing;
  get diagnostics v_inserted = row_count;

  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.spa_payments
   where visit_id = p_visit_id
     and company_id = v_company_id;
  v_payment_status := case
    when v_total_paid >= coalesce(v_price, 0) then 'pagado'
    when v_total_paid > 0 then 'parcial'
    else 'pendiente'
  end;

  update public.spa_visits
     set payment_status = v_payment_status,
         debt_due_date = case
           when v_payment_status = 'pagado' then null
           else debt_due_date
         end
   where id = p_visit_id;

  return jsonb_build_object(
    'success', true,
    'inserted', v_inserted = 1,
    'visit_id', p_visit_id,
    'payment_status', v_payment_status,
    'total_paid', v_total_paid
  );
end;
$$;

create or replace function public.rpc_set_visit_outcome(
  p_visit_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_current_status text;
  v_event_type text;
  v_cancelled_messages integer := 0;
begin
  if v_actor_id is null then raise exception 'Not authenticated'; end if;
  if p_status not in ('cancelado', 'no_asistio') then
    raise exception 'Resultado de atención inválido';
  end if;

  select company_id into v_company_id
    from public.profiles
   where id = v_actor_id;
  if v_company_id is null then raise exception 'Not authorized'; end if;

  select status
    into v_current_status
    from public.spa_visits
   where id = p_visit_id
     and company_id = v_company_id
   for update;
  if not found then raise exception 'Atención no encontrada'; end if;
  if v_current_status = 'completado' then
    raise exception 'Una atención completada no se puede cancelar';
  end if;

  update public.spa_visits
     set status = p_status,
         completed_at = null
   where id = p_visit_id
     and status is distinct from p_status;

  update public.crm_wa_queue
     set status = 'cancelled',
         lease_owner = null,
         lease_expires_at = null,
         last_error_code = 'VISIT_CANCELLED',
         last_error_at = now()
   where visit_id = p_visit_id
     and company_id = v_company_id
     and status in ('queued', 'retry_scheduled', 'leased');
  get diagnostics v_cancelled_messages = row_count;

  v_event_type := case p_status
    when 'cancelado' then 'cancelled'
    else 'no_show'
  end;
  insert into public.spa_visit_events (
    company_id, visit_id, event_type, actor_id, payload
  )
  values (
    v_company_id,
    p_visit_id,
    v_event_type,
    v_actor_id,
    jsonb_build_object('previous_status', v_current_status)
  )
  on conflict (visit_id, event_type) do nothing;

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id,
    'status', p_status,
    'cancelled_messages', v_cancelled_messages
  );
end;
$$;

drop function if exists public.rpc_create_campaign(text, text, jsonb, integer, integer);

create or replace function public.rpc_create_campaign(
  p_name text,
  p_target_contact_ids uuid[],
  p_target_raw_phones text[],
  p_sequence jsonb,
  p_min_delay_sec integer,
  p_max_delay_sec integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_campaign_id uuid;
  v_queued_items integer := 0;
  v_step jsonb;
  v_contact record;
  v_phone text;
  v_index integer;
  v_scheduled_at timestamptz;
begin
  select company_id into v_company_id
    from public.profiles
   where id = (select auth.uid());
  if v_company_id is null then raise exception 'Not authorized'; end if;
  if not exists (
    select 1 from public.companies
     where id = v_company_id
       and status = 'activa'
       and subscription_end_at > now()
  ) then raise exception 'La empresa no tiene acceso activo'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Nombre obligatorio'; end if;
  if p_min_delay_sec < 10 or p_max_delay_sec < p_min_delay_sec or p_max_delay_sec > 3600 then
    raise exception 'Rango de espera inválido';
  end if;
  if jsonb_typeof(p_sequence) <> 'array' or jsonb_array_length(p_sequence) = 0 then
    raise exception 'La secuencia está vacía';
  end if;
  if coalesce(cardinality(p_target_contact_ids), 0)
     + coalesce(cardinality(p_target_raw_phones), 0) > 500 then
    raise exception 'La campaña excede 500 destinatarios';
  end if;

  insert into public.crm_wa_campaigns (
    company_id, name, message_template, sequence,
    min_delay_sec, max_delay_sec, status, total_contacts, started_at
  )
  values (
    v_company_id, trim(p_name), 'Sequence (Backend Resolved)', p_sequence,
    p_min_delay_sec, p_max_delay_sec, 'running', 0, now()
  )
  returning id into v_campaign_id;

  for v_contact in
    select id, regexp_replace(phone, '[^0-9]', '', 'g') as phone
      from public.crm_marketing_contacts
     where company_id = v_company_id
       and id = any(coalesce(p_target_contact_ids, '{}'::uuid[]))
       and not coalesce(is_archived, false)
  loop
    v_index := 0;
    for v_step in select * from jsonb_array_elements(p_sequence)
    loop
      v_index := v_index + 1;
      if nullif(v_step->>'content', '') is null then
        raise exception 'Cada paso necesita contenido';
      end if;
      v_scheduled_at := now() + (v_index * interval '1 millisecond');
      insert into public.crm_wa_queue (
        company_id, campaign_id, contact_id, phone, message, media_url,
        status, scheduled_for, next_attempt_at, delay_after_ms,
        idempotency_key, message_type, priority
      )
      values (
        v_company_id, v_campaign_id, v_contact.id, v_contact.phone,
        v_step->>'content', nullif(v_step->>'mediaUrl', ''),
        'queued', v_scheduled_at, v_scheduled_at,
        case when v_index = jsonb_array_length(p_sequence)
          then null else greatest(0, coalesce((v_step->>'delayAfterMs')::integer, 0)) end,
        'campaign:' || v_campaign_id::text || ':contact:' || v_contact.id::text || ':step:' || v_index,
        'campaign', 100
      );
      v_queued_items := v_queued_items + 1;
    end loop;
  end loop;

  for v_phone in
    select distinct regexp_replace(raw_phone, '[^0-9]', '', 'g')
      from unnest(coalesce(p_target_raw_phones, '{}'::text[])) raw_phone
     where char_length(regexp_replace(raw_phone, '[^0-9]', '', 'g')) between 8 and 20
  loop
    v_index := 0;
    for v_step in select * from jsonb_array_elements(p_sequence)
    loop
      v_index := v_index + 1;
      if nullif(v_step->>'content', '') is null then
        raise exception 'Cada paso necesita contenido';
      end if;
      v_scheduled_at := now() + (v_index * interval '1 millisecond');
      insert into public.crm_wa_queue (
        company_id, campaign_id, phone, message, media_url,
        status, scheduled_for, next_attempt_at, delay_after_ms,
        idempotency_key, message_type, priority
      )
      values (
        v_company_id, v_campaign_id, v_phone,
        v_step->>'content', nullif(v_step->>'mediaUrl', ''),
        'queued', v_scheduled_at, v_scheduled_at,
        case when v_index = jsonb_array_length(p_sequence)
          then null else greatest(0, coalesce((v_step->>'delayAfterMs')::integer, 0)) end,
        'campaign:' || v_campaign_id::text || ':phone:' || md5(v_phone) || ':step:' || v_index,
        'campaign', 100
      );
      v_queued_items := v_queued_items + 1;
    end loop;
  end loop;

  if v_queued_items = 0 then
    raise exception 'No hay destinatarios válidos';
  end if;

  update public.crm_wa_campaigns
     set total_contacts = v_queued_items
   where id = v_campaign_id;

  return jsonb_build_object(
    'success', true,
    'campaign_id', v_campaign_id,
    'queued_items', v_queued_items
  );
end;
$$;

create or replace function public.rpc_mark_campaign_reply(
  p_company_id uuid,
  p_phone text,
  p_since timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_queue_id uuid;
  v_campaign_id uuid;
begin
  select id, campaign_id
    into v_queue_id, v_campaign_id
    from public.crm_wa_queue
   where company_id = p_company_id
     and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
     and status = 'sent'
     and not coalesce(replied, false)
     and sent_at >= p_since
   order by sent_at desc
   for update skip locked
   limit 1;

  if not found then return false; end if;

  update public.crm_wa_queue
     set replied = true
   where id = v_queue_id;

  if v_campaign_id is not null then
    update public.crm_wa_campaigns
       set replied_count = coalesce(replied_count, 0) + 1
     where id = v_campaign_id
       and company_id = p_company_id;
  end if;

  return true;
end;
$$;

create or replace function public.rpc_delete_marketing_contact(p_contact_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id
    from public.profiles
   where id = (select auth.uid());
  if v_company_id is null then raise exception 'Not authorized'; end if;

  update public.crm_marketing_contacts
     set is_archived = true,
         updated_at = now()
   where id = p_contact_id
     and company_id = v_company_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Contacto no encontrado');
  end if;

  update public.crm_wa_queue
     set status = 'cancelled',
         lease_owner = null,
         lease_expires_at = null,
         last_error_code = 'CONTACT_ARCHIVED',
         last_error_at = now()
   where contact_id = p_contact_id
     and company_id = v_company_id
     and status in ('queued', 'retry_scheduled', 'leased');

  return jsonb_build_object('success', true, 'archived', true);
end;
$$;

revoke all on function public.rpc_complete_visit(uuid, text, boolean, numeric, date, text)
  from public, anon;
grant execute on function public.rpc_complete_visit(uuid, text, boolean, numeric, date, text)
  to authenticated;

revoke all on function public.rpc_add_visit_payment(uuid, numeric, text, text)
  from public, anon;
grant execute on function public.rpc_add_visit_payment(uuid, numeric, text, text)
  to authenticated;

revoke all on function public.rpc_set_visit_outcome(uuid, text)
  from public, anon;
grant execute on function public.rpc_set_visit_outcome(uuid, text)
  to authenticated;

revoke all on function public.rpc_create_campaign(text, uuid[], text[], jsonb, integer, integer)
  from public, anon;
grant execute on function public.rpc_create_campaign(text, uuid[], text[], jsonb, integer, integer)
  to authenticated;

revoke all on function public.rpc_mark_campaign_reply(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.rpc_mark_campaign_reply(uuid, text, timestamptz)
  to service_role;

revoke all on function public.rpc_delete_marketing_contact(uuid)
  from public, anon;
grant execute on function public.rpc_delete_marketing_contact(uuid)
  to authenticated;
