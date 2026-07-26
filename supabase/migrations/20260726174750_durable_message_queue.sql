alter table public.crm_wa_queue
  add column attempt_count integer not null default 0,
  add column max_attempts integer not null default 5,
  add column lease_owner text,
  add column lease_expires_at timestamptz,
  add column next_attempt_at timestamptz,
  add column idempotency_key text not null default gen_random_uuid()::text,
  add column provider_message_id text,
  add column last_error_code text,
  add column last_error_at timestamptz,
  add column priority smallint not null default 100,
  add column message_type text not null default 'campaign';

alter table public.crm_wa_queue
  drop constraint if exists crm_queue_status_valid;

update public.crm_wa_queue
set status = case status
  when 'pendiente' then 'queued'
  when 'enviando' then 'retry_scheduled'
  when 'enviado' then 'sent'
  when 'fallido' then 'failed'
  when 'cancelado' then 'cancelled'
  else status
end,
next_attempt_at = coalesce(scheduled_for, created_at, now()),
attempt_count = case when status in ('enviando', 'fallido') then 1 else 0 end,
message_type = case when campaign_id is null then 'transactional' else 'campaign' end;

alter table public.crm_wa_queue
  alter column next_attempt_at set default now(),
  alter column next_attempt_at set not null,
  add constraint crm_wa_queue_status_check
    check (
      status in (
        'queued',
        'leased',
        'processing',
        'sent',
        'retry_scheduled',
        'failed',
        'dead_letter',
        'cancelled'
      )
    ),
  add constraint crm_wa_queue_attempt_count_check
    check (attempt_count >= 0),
  add constraint crm_wa_queue_max_attempts_check
    check (max_attempts between 1 and 20),
  add constraint crm_wa_queue_attempt_bounds_check
    check (attempt_count <= max_attempts),
  add constraint crm_wa_queue_lease_check
    check (
      (status in ('leased', 'processing') and lease_owner is not null and lease_expires_at is not null)
      or
      (status not in ('leased', 'processing') and lease_owner is null and lease_expires_at is null)
    ),
  add constraint crm_wa_queue_idempotency_key_check
    check (char_length(idempotency_key) between 1 and 200),
  add constraint crm_wa_queue_message_type_check
    check (message_type in ('transactional', 'campaign')),
  add constraint crm_wa_queue_priority_check
    check (priority between 0 and 1000),
  add constraint crm_wa_queue_company_idempotency_key
    unique (company_id, idempotency_key);

drop index if exists public.idx_crm_wa_queue_scheduled;

create index crm_wa_queue_claim_idx
  on public.crm_wa_queue (
    company_id,
    priority desc,
    next_attempt_at,
    scheduled_for,
    created_at
  )
  where status in ('queued', 'retry_scheduled');

create index crm_wa_queue_expired_lease_idx
  on public.crm_wa_queue (lease_expires_at)
  where status in ('leased', 'processing');

create or replace function public.rpc_claim_queue_item(
  p_company_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 90,
  p_allow_campaign boolean default true
)
returns setof public.crm_wa_queue
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_worker_id is null or char_length(p_worker_id) not between 1 and 128 then
    raise exception 'invalid worker id';
  end if;
  if p_lease_seconds not between 15 and 300 then
    raise exception 'invalid lease duration';
  end if;

  update public.crm_wa_queue
     set status = case
           when attempt_count >= max_attempts then 'dead_letter'
           else 'retry_scheduled'
         end,
         next_attempt_at = now(),
         lease_owner = null,
         lease_expires_at = null,
         last_error_code = 'LEASE_EXPIRED',
         last_error_at = now(),
         error_message = 'El worker anterior no confirmó el envío antes de vencer el lease'
   where company_id = p_company_id
     and status in ('leased', 'processing')
     and lease_expires_at <= now();

  return query
  with candidate as (
    select q.id
      from public.crm_wa_queue q
     where q.company_id = p_company_id
       and q.status in ('queued', 'retry_scheduled')
       and q.next_attempt_at <= now()
       and coalesce(q.scheduled_for, q.created_at) <= now()
       and (p_allow_campaign or q.message_type = 'transactional')
       and not exists (
         select 1
           from public.crm_wa_queue active
          where active.company_id = q.company_id
            and active.status in ('leased', 'processing')
       )
       and (
         q.campaign_id is null
         or exists (
           select 1
             from public.crm_wa_campaigns c
            where c.id = q.campaign_id
              and c.company_id = q.company_id
              and c.status = 'running'
         )
       )
     order by q.priority desc, q.next_attempt_at, q.scheduled_for, q.created_at
     for update of q skip locked
     limit 1
  )
  update public.crm_wa_queue q
     set status = 'leased',
         attempt_count = q.attempt_count + 1,
         lease_owner = p_worker_id,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         processing_started_at = now(),
         last_error_code = null,
         last_error_at = null
    from candidate
   where q.id = candidate.id
  returning q.*;
end;
$$;

create or replace function public.rpc_mark_queue_processing(
  p_queue_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.crm_wa_queue
     set status = 'processing'
   where id = p_queue_id
     and status = 'leased'
     and lease_owner = p_worker_id
     and lease_expires_at > now();
  return found;
end;
$$;

create or replace function public.rpc_complete_queue_item(
  p_queue_id uuid,
  p_worker_id text,
  p_provider_message_id text default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_campaign_id uuid;
begin
  update public.crm_wa_queue
     set status = 'sent',
         sent_at = now(),
         provider_message_id = nullif(p_provider_message_id, ''),
         lease_owner = null,
         lease_expires_at = null,
         error_message = null,
         last_error_code = null,
         last_error_at = null
   where id = p_queue_id
     and status = 'processing'
     and lease_owner = p_worker_id
     and lease_expires_at > now()
  returning campaign_id into v_campaign_id;

  if not found then
    return false;
  end if;

  if v_campaign_id is not null then
    update public.crm_wa_campaigns
       set sent_count = coalesce(sent_count, 0) + 1,
           status = case
             when coalesce(sent_count, 0) + 1 + coalesce(failed_count, 0) >= total_contacts
             then 'completed'
             else status
           end
     where id = v_campaign_id;
  end if;

  return true;
end;
$$;

create or replace function public.rpc_fail_queue_item(
  p_queue_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_message text,
  p_retryable boolean,
  p_base_delay_seconds integer default 30
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.crm_wa_queue%rowtype;
  v_next_status text;
  v_delay_seconds integer;
begin
  select *
    into v_item
    from public.crm_wa_queue
   where id = p_queue_id
     and status = 'processing'
     and lease_owner = p_worker_id
   for update;

  if not found then
    return null;
  end if;

  if not p_retryable then
    v_next_status := 'failed';
  elsif v_item.attempt_count >= v_item.max_attempts then
    v_next_status := 'dead_letter';
  else
    v_next_status := 'retry_scheduled';
  end if;

  v_delay_seconds := least(
    3600,
    greatest(1, p_base_delay_seconds) * (2 ^ greatest(0, v_item.attempt_count - 1))::integer
      + floor(random() * greatest(1, p_base_delay_seconds / 5.0))::integer
  );

  update public.crm_wa_queue
     set status = v_next_status,
         next_attempt_at = case
           when v_next_status = 'retry_scheduled'
           then now() + make_interval(secs => v_delay_seconds)
           else next_attempt_at
         end,
         lease_owner = null,
         lease_expires_at = null,
         error_message = left(coalesce(p_error_message, 'Error de proveedor'), 1000),
         last_error_code = left(coalesce(p_error_code, 'UNKNOWN'), 100),
         last_error_at = now()
   where id = p_queue_id;

  if v_next_status in ('failed', 'dead_letter') and v_item.campaign_id is not null then
    update public.crm_wa_campaigns
       set failed_count = coalesce(failed_count, 0) + 1,
           status = case
             when coalesce(sent_count, 0) + coalesce(failed_count, 0) + 1 >= total_contacts
             then 'completed'
             else status
           end
     where id = v_item.campaign_id;
  end if;

  return v_next_status;
end;
$$;

create or replace function public.rpc_record_queue_send_success(
  p_company_id uuid,
  p_next_allowed_send_at timestamptz
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.wa_sessions
     set last_message_sent_at = now(),
         next_allowed_send_at = p_next_allowed_send_at,
         daily_sent_count = case
           when daily_reset_at is null or daily_reset_at <= now() - interval '24 hours'
           then 1
           else coalesce(daily_sent_count, 0) + 1
         end,
         daily_reset_at = case
           when daily_reset_at is null or daily_reset_at <= now() - interval '24 hours'
           then now()
           else daily_reset_at
         end,
         consecutive_errors = 0,
         updated_at = now()
   where company_id = p_company_id;
$$;

create or replace function public.rpc_record_queue_send_failure(
  p_company_id uuid,
  p_next_allowed_send_at timestamptz,
  p_reason text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  update public.wa_sessions
     set consecutive_errors = least(coalesce(consecutive_errors, 0) + 1, 3),
         status = case
           when coalesce(consecutive_errors, 0) + 1 >= 3
           then 'error_desconexion'
           else status
         end,
         next_allowed_send_at = p_next_allowed_send_at,
         last_disconnect_reason = left(coalesce(p_reason, 'Error de envío'), 500),
         updated_at = now()
   where company_id = p_company_id
  returning status into v_status;

  return v_status;
end;
$$;

create or replace function public.rpc_create_campaign(
  p_name text,
  p_target_tag text,
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
  v_company_status text;
  v_queued_items integer := 0;
  contact_rec record;
  seq_step jsonb;
  v_seq_length integer;
  v_idx integer;
begin
  select company_id into v_company_id
    from public.profiles
   where id = (select auth.uid());
  if v_company_id is null then raise exception 'Not authorized'; end if;

  select status into v_company_status
    from public.companies
   where id = v_company_id;
  if v_company_status is null or v_company_status <> 'activa' then
    raise exception 'La empresa no se encuentra activa.';
  end if;
  if p_min_delay_sec < 10 or p_max_delay_sec < p_min_delay_sec then
    raise exception 'Rango de espera inválido.';
  end if;

  v_seq_length := jsonb_array_length(p_sequence);
  if v_seq_length = 0 then raise exception 'La secuencia está vacía.'; end if;

  insert into public.crm_wa_campaigns (
    company_id, name, message_template, sequence,
    min_delay_sec, max_delay_sec, status, total_contacts
  )
  values (
    v_company_id, p_name, 'Sequence (Backend Resolved)', p_sequence,
    p_min_delay_sec, p_max_delay_sec, 'running', 0
  )
  returning id into v_campaign_id;

  for contact_rec in
    select id, phone
      from public.crm_marketing_contacts
     where company_id = v_company_id
       and (p_target_tag = '' or p_target_tag = any(tags))
  loop
    v_idx := 0;
    for seq_step in select * from jsonb_array_elements(p_sequence)
    loop
      v_idx := v_idx + 1;
      insert into public.crm_wa_queue (
        company_id, campaign_id, contact_id, phone, message, status,
        scheduled_for, next_attempt_at, delay_after_ms, message_type, priority
      )
      values (
        v_company_id, v_campaign_id, contact_rec.id, contact_rec.phone,
        seq_step->>'content', 'queued',
        now() + (v_idx * interval '1 millisecond'),
        now() + (v_idx * interval '1 millisecond'),
        case when v_idx = v_seq_length then null else (seq_step->>'delayAfterMs')::integer end,
        'campaign', 100
      );
      v_queued_items := v_queued_items + 1;
    end loop;
  end loop;

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

create or replace function public.rpc_cancel_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_cancelled integer;
begin
  select company_id into v_company_id
    from public.profiles
   where id = (select auth.uid());

  update public.crm_wa_campaigns
     set status = 'cancelada'
   where id = p_campaign_id
     and company_id = v_company_id
     and status in ('activa', 'borrador', 'queued', 'running');

  update public.crm_wa_queue
     set status = 'cancelled',
         lease_owner = null,
         lease_expires_at = null,
         last_error_code = 'CAMPAIGN_CANCELLED',
         last_error_at = now()
   where campaign_id = p_campaign_id
     and company_id = v_company_id
     and status in ('queued', 'retry_scheduled', 'leased');
  get diagnostics v_cancelled = row_count;

  return jsonb_build_object('success', true, 'items_cancelled', v_cancelled);
end;
$$;

revoke all on function public.rpc_claim_queue_item(uuid, text, integer, boolean)
  from public, anon, authenticated;
revoke all on function public.rpc_mark_queue_processing(uuid, text)
  from public, anon, authenticated;
revoke all on function public.rpc_complete_queue_item(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.rpc_fail_queue_item(uuid, text, text, text, boolean, integer)
  from public, anon, authenticated;
revoke all on function public.rpc_record_queue_send_success(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.rpc_record_queue_send_failure(uuid, timestamptz, text)
  from public, anon, authenticated;

grant execute on function public.rpc_claim_queue_item(uuid, text, integer, boolean)
  to service_role;
grant execute on function public.rpc_mark_queue_processing(uuid, text)
  to service_role;
grant execute on function public.rpc_complete_queue_item(uuid, text, text)
  to service_role;
grant execute on function public.rpc_fail_queue_item(uuid, text, text, text, boolean, integer)
  to service_role;
grant execute on function public.rpc_record_queue_send_success(uuid, timestamptz)
  to service_role;
grant execute on function public.rpc_record_queue_send_failure(uuid, timestamptz, text)
  to service_role;
