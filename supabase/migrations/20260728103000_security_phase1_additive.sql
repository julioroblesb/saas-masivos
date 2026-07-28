begin;

-- ============================================================================
-- FASE 1C: MIGRACIÓN ADITIVA SEGURA DE WA_SESSIONS & WA_WEBHOOK_SECRETS
-- ============================================================================

-- 1. Agregar columna evolution_instance_name a public.wa_sessions (SIN webhook_secret)
alter table public.wa_sessions
  add column if not exists evolution_instance_name text;

-- 2. Preservar sesiones Evolution válidas y resetear únicamente las legacy
with expected as (
  select
    company_id,
    'company_' || replace(company_id::text, '-', '') as expected_instance
  from public.wa_sessions
)
update public.wa_sessions ws
set
  evolution_instance_name = e.expected_instance,
  status = case
    when ws.bb_project_id = e.expected_instance
      then ws.status
    else 'desconectado'
  end,
  phone_number = case
    when ws.bb_project_id = e.expected_instance
      then ws.phone_number
    else null
  end,
  connection_started_at = case
    when ws.bb_project_id = e.expected_instance
      then ws.connection_started_at
    else null
  end
from expected e
where e.company_id = ws.company_id
  and ws.evolution_instance_name is null;

-- 3. Preflight: verificar que no existen duplicados antes de crear el índice único
do $$
declare
  v_dup_count integer;
begin
  select count(*) into v_dup_count from (
    select evolution_instance_name
    from public.wa_sessions
    where evolution_instance_name is not null
    group by evolution_instance_name
    having count(*) > 1
  ) dups;

  if v_dup_count > 0 then
    raise exception 'Preflight failed: duplicate evolution_instance_name found';
  end if;
end $$;

-- 4. Crear índice único parcial sobre evolution_instance_name
create unique index if not exists wa_sessions_evolution_instance_name_idx
  on public.wa_sessions (evolution_instance_name)
  where evolution_instance_name is not null;

-- 5. Crear tabla separada y segura para secretos de webhook (inaccesible desde el navegador)
create table if not exists public.wa_webhook_secrets (
  company_id uuid primary key references public.companies(id) on delete cascade,
  secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now(),
  constraint wa_webhook_secrets_format_check
    check (char_length(secret) = 64 and secret ~ '^[0-9a-f]{64}$')
);

alter table public.wa_webhook_secrets enable row level security;

revoke all on table public.wa_webhook_secrets from anon, authenticated;
grant select, insert, update, delete on table public.wa_webhook_secrets to service_role;

-- Backfill para empresas existentes en wa_sessions
insert into public.wa_webhook_secrets (company_id, secret)
select company_id, encode(extensions.gen_random_bytes(32), 'hex')
from public.wa_sessions
on conflict (company_id) do nothing;


-- ============================================================================
-- FASE 1D: CORREGIR SOBREPAGO EN RPC_COMPLETE_VISIT (CONSERVA FIRMA CANÓNICA)
-- ============================================================================

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
  v_completion_payment_exists boolean;
  v_effective_add_payment numeric;
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

  -- Calcular pagos acumulados actuales
  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.spa_payments
   where visit_id = p_visit_id
     and company_id = v_company_id;

  -- Comprobar si ya se registró el pago de finalización de esta atención (idempotencia)
  select exists (
    select 1
      from public.spa_payments
     where company_id = v_company_id
       and idempotency_key = 'visit:' || p_visit_id::text || ':completion'
  ) into v_completion_payment_exists;

  -- Determinar el abono adicional efectivo para la validación
  v_effective_add_payment := case
    when v_completion_payment_exists then 0
    else coalesce(p_initial_payment, 0)
  end;

  -- Validar que el pago acumulado total no excede el precio
  if v_total_paid + v_effective_add_payment > coalesce(v_visit.price_charged, 0) then
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

  -- Recalcular total pagado exacto tras inserción idempotente
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


-- ============================================================================
-- FASE 1E: LÍMITES Y VALIDACIÓN PREVIA EN RPC_CREATE_CAMPAIGN (FIRMA CANÓNICA)
-- ============================================================================

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
  v_recipient_count integer;
  v_step_count integer;
  v_step_content text;
  v_delay_val text;
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

  if p_min_delay_sec is null or p_max_delay_sec is null then
    raise exception 'Los tiempos de espera no pueden ser nulos';
  end if;

  if p_min_delay_sec < 10 or p_max_delay_sec < p_min_delay_sec or p_max_delay_sec > 3600 then
    raise exception 'Rango de espera inválido';
  end if;

  if jsonb_typeof(p_sequence) <> 'array' or jsonb_array_length(p_sequence) = 0 then
    raise exception 'La secuencia está vacía';
  end if;

  v_step_count := jsonb_array_length(p_sequence);
  if v_step_count > 10 then
    raise exception 'La secuencia no puede tener más de 10 pasos';
  end if;

  if octet_length(p_sequence::text) > 100000 then
    raise exception 'El tamaño de la secuencia de mensajes excede el límite permitido';
  end if;

  v_recipient_count := coalesce(cardinality(p_target_contact_ids), 0)
                     + coalesce(cardinality(p_target_raw_phones), 0);

  if v_recipient_count > 500 then
    raise exception 'La campaña excede 500 destinatarios';
  end if;

  if v_recipient_count * v_step_count > 5000 then
    raise exception 'La campaña excede 5000 mensajes totales';
  end if;

  -- VALIDAR TODOS LOS PASOS ANTES DE CUALQUIER INSERCIÓN
  v_index := 0;
  for v_step in select * from jsonb_array_elements(p_sequence)
  loop
    v_index := v_index + 1;
    v_step_content := coalesce(v_step->>'content', v_step->>'message', '');
    if nullif(trim(v_step_content), '') is null then
      raise exception 'Cada paso necesita contenido en el paso %', v_index;
    end if;
    if char_length(v_step_content) > 4096 then
      raise exception 'El mensaje excede el límite de 4096 caracteres en el paso %', v_index;
    end if;
    if v_step ? 'delayAfterMs' and v_step->>'delayAfterMs' is not null then
      v_delay_val := v_step->>'delayAfterMs';
      if v_delay_val !~ '^[0-9]+$' then
        raise exception 'El tiempo de espera delayAfterMs en el paso % debe ser un número entero', v_index;
      end if;
      if v_delay_val::bigint < 0 or v_delay_val::bigint > 86400000 then
        raise exception 'El tiempo de espera delayAfterMs en el paso % debe estar entre 0 y 86400000 ms', v_index;
      end if;
    end if;
  end loop;

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
      v_step_content := coalesce(v_step->>'content', v_step->>'message', '');
      v_scheduled_at := now() + (v_index * interval '1 millisecond');
      insert into public.crm_wa_queue (
        company_id, campaign_id, contact_id, phone, message, media_url,
        status, scheduled_for, next_attempt_at, delay_after_ms,
        idempotency_key, message_type, priority
      )
      values (
        v_company_id, v_campaign_id, v_contact.id, v_contact.phone,
        v_step_content, nullif(v_step->>'mediaUrl', ''),
        'queued', v_scheduled_at, v_scheduled_at,
        case when v_index = jsonb_array_length(p_sequence)
          then null else coalesce((v_step->>'delayAfterMs')::integer, 0) end,
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
      v_step_content := coalesce(v_step->>'content', v_step->>'message', '');
      v_scheduled_at := now() + (v_index * interval '1 millisecond');
      insert into public.crm_wa_queue (
        company_id, campaign_id, phone, message, media_url,
        status, scheduled_for, next_attempt_at, delay_after_ms,
        idempotency_key, message_type, priority
      )
      values (
        v_company_id, v_campaign_id, v_phone,
        v_step_content, nullif(v_step->>'mediaUrl', ''),
        'queued', v_scheduled_at, v_scheduled_at,
        case when v_index = jsonb_array_length(p_sequence)
          then null else coalesce((v_step->>'delayAfterMs')::integer, 0) end,
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


-- ============================================================================
-- FASE 1F: PRIVILEGIOS DE TRUNCATE (SIN REVOCAR DML TODAVÍA)
-- ============================================================================

revoke truncate on all tables in schema public from anon, authenticated;

commit;
