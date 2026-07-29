begin;

-- Every template contact must have a real relationship to completed visits.
-- The original fixture had 24 contacts without history, so their CRM metrics
-- were correctly returning zero even though the rest of their profile existed.
with missing_contacts as (
  select
    contact.id,
    contact.company_id,
    row_number() over (order by contact.id) as row_num
  from public.crm_marketing_contacts as contact
  where contact.company_id = '3c3cb849-06c8-4250-b4cf-9375422684a6'::uuid
    and not exists (
      select 1
      from public.spa_visits as existing_visit
      where existing_visit.company_id = contact.company_id
        and existing_visit.contact_id = contact.id
        and existing_visit.status = 'completado'
    )
),
fixture as (
  select
    missing.id as contact_id,
    missing.company_id,
    missing.row_num,
    sequence.visit_num,
    selected_service.id as service_id,
    selected_service.price as service_price,
    selected_staff.id as staff_id,
    (
      (
        (now() at time zone 'America/Lima')::date
        - ((missing.row_num * 3 + sequence.visit_num * 11) % 56)::integer
      )::timestamp
      + time '10:00'
      + make_interval(mins => (((missing.row_num + sequence.visit_num) % 6) * 45)::integer)
    ) at time zone 'America/Lima' as visit_at
  from missing_contacts as missing
  cross join generate_series(1, 2) as sequence(visit_num)
  cross join lateral (
    select service.id, service.price
    from public.spa_services as service
    where service.company_id = missing.company_id
      and service.is_active = true
    order by md5(missing.id::text || sequence.visit_num::text || service.id::text)
    limit 1
  ) as selected_service
  left join lateral (
    select staff.id
    from public.spa_staff as staff
    where staff.company_id = missing.company_id
      and staff.is_active = true
    order by md5(missing.id::text || sequence.visit_num::text || staff.id::text)
    limit 1
  ) as selected_staff on true
)
insert into public.spa_visits (
  company_id,
  contact_id,
  service_id,
  staff_id,
  visit_date,
  scheduled_date,
  duration_minutes,
  status,
  price_charged,
  payment_status,
  completed_at,
  notes,
  care_sent,
  follow_up_date,
  follow_up_sent,
  created_at
)
select
  fixture.company_id,
  fixture.contact_id,
  fixture.service_id,
  fixture.staff_id,
  fixture.visit_at,
  fixture.visit_at,
  45 + (((fixture.row_num + fixture.visit_num) % 4) * 15)::integer,
  'completado',
  round(greatest(35, fixture.service_price), 2),
  'pagado',
  fixture.visit_at + interval '55 minutes',
  case fixture.visit_num
    when 1 then 'Primera atención demo completada sin incidencias.'
    else 'Mantenimiento demo realizado; clienta satisfecha con el resultado.'
  end,
  true,
  fixture.visit_at + interval '15 days',
  true,
  fixture.visit_at - interval '2 days'
from fixture;

insert into public.spa_payments (
  company_id,
  visit_id,
  amount,
  payment_method,
  payment_date,
  notes,
  created_at,
  source,
  idempotency_key
)
select
  visit.company_id,
  visit.id,
  visit.price_charged,
  (array['yape', 'efectivo', 'tarjeta', 'plin'])
    [1 + (abs(hashtext(visit.id::text)) % 4)],
  visit.completed_at + interval '5 minutes',
  'Pago completo de atención demo.',
  visit.completed_at + interval '5 minutes',
  'manual',
  'demo-profile-backfill:payment:' || visit.id::text
from public.spa_visits as visit
where visit.company_id = '3c3cb849-06c8-4250-b4cf-9375422684a6'::uuid
  and visit.status = 'completado'
  and visit.notes in (
    'Primera atención demo completada sin incidencias.',
    'Mantenimiento demo realizado; clienta satisfecha con el resultado.'
  )
  and not exists (
    select 1
    from public.spa_payments as payment
    where payment.company_id = visit.company_id
      and payment.visit_id = visit.id
  );

with zero_spend_contacts as (
  select contact.id, contact.company_id
  from public.crm_marketing_contacts as contact
  where contact.company_id = '3c3cb849-06c8-4250-b4cf-9375422684a6'::uuid
    and exists (
      select 1
      from public.spa_visits as completed_visit
      where completed_visit.company_id = contact.company_id
        and completed_visit.contact_id = contact.id
        and completed_visit.status = 'completado'
    )
    and not exists (
      select 1
      from public.spa_visits as paid_visit
      join public.spa_payments as existing_payment
        on existing_payment.company_id = paid_visit.company_id
       and existing_payment.visit_id = paid_visit.id
       and existing_payment.amount > 0
      where paid_visit.company_id = contact.company_id
        and paid_visit.contact_id = contact.id
        and paid_visit.status = 'completado'
    )
),
payable_visit as (
  select
    zero_spend.company_id,
    recent_visit.id as visit_id,
    greatest(coalesce(recent_visit.price_charged, 0), 35)::numeric as amount,
    coalesce(recent_visit.completed_at, recent_visit.visit_date, now()) as paid_at
  from zero_spend_contacts as zero_spend
  cross join lateral (
    select visit.id, visit.price_charged, visit.completed_at, visit.visit_date
    from public.spa_visits as visit
    where visit.company_id = zero_spend.company_id
      and visit.contact_id = zero_spend.id
      and visit.status = 'completado'
    order by coalesce(visit.completed_at, visit.visit_date) desc
    limit 1
  ) as recent_visit
)
insert into public.spa_payments (
  company_id,
  visit_id,
  amount,
  payment_method,
  payment_date,
  notes,
  created_at,
  source,
  idempotency_key
)
select
  payable.company_id,
  payable.visit_id,
  payable.amount,
  'yape',
  payable.paid_at + interval '5 minutes',
  'Pago demo regularizado para completar el historial de la clienta.',
  payable.paid_at + interval '5 minutes',
  'manual',
  'demo-profile-regularized:payment:' || payable.visit_id::text
from payable_visit as payable
where not exists (
  select 1
  from public.spa_payments as payment
  where payment.company_id = payable.company_id
    and payment.visit_id = payable.visit_id
);

with contact_metrics as (
  select
    contact.id as contact_id,
    count(visit.id) filter (where visit.status = 'completado')::integer as total_visits,
    coalesce(
      sum(payment_totals.amount_paid) filter (where visit.status = 'completado'),
      0
    )::numeric as total_spent,
    max(coalesce(visit.completed_at, visit.visit_date))
      filter (where visit.status = 'completado') as last_visit_date
  from public.crm_marketing_contacts as contact
  left join public.spa_visits as visit
    on visit.company_id = contact.company_id
   and visit.contact_id = contact.id
  left join lateral (
    select coalesce(sum(payment.amount), 0)::numeric as amount_paid
    from public.spa_payments as payment
    where payment.company_id = visit.company_id
      and payment.visit_id = visit.id
  ) as payment_totals on true
  where contact.company_id = '3c3cb849-06c8-4250-b4cf-9375422684a6'::uuid
  group by contact.id
)
update public.crm_marketing_contacts as contact
set
  total_visits = metrics.total_visits,
  total_spent = metrics.total_spent,
  last_visit_date = metrics.last_visit_date,
  customer_segment = case
    when metrics.total_visits >= 4 and metrics.total_spent >= 500 then 'VIP'
    when metrics.total_visits >= 3 then 'Frecuente'
    when metrics.last_visit_date >= now() - interval '30 days' then 'Nuevo'
    else 'Ocasional'
  end,
  updated_at = now()
from contact_metrics as metrics
where contact.id = metrics.contact_id;

drop function if exists public.rpc_get_clients_metrics();

create function public.rpc_get_clients_metrics()
returns table(
  id uuid,
  phone text,
  name text,
  email text,
  document_number text,
  birthday text,
  opt_in_source text,
  allergies_and_conditions text,
  preferences text,
  internal_notes text,
  is_archived boolean,
  created_at timestamptz,
  campaigns_count bigint,
  last_message_sent_at timestamptz,
  last_reply_at timestamptz,
  total_visits bigint,
  total_spent numeric,
  customer_segment text,
  last_visit_at timestamptz,
  last_service_name text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
begin
  select profile.company_id
    into v_company_id
    from public.profiles as profile
   where profile.id = auth.uid();

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  return query
  select
    contact.id,
    contact.phone::text,
    contact.name::text,
    contact.email::text,
    contact.document_number::text,
    contact.birthday::text,
    contact.opt_in_source::text,
    contact.allergies_and_conditions::text,
    contact.preferences::text,
    contact.internal_notes::text,
    coalesce(contact.is_archived, false),
    contact.created_at,
    coalesce(message_metrics.campaigns_count, 0)::bigint,
    message_metrics.last_message_sent_at,
    message_metrics.last_reply_at,
    coalesce(visit_metrics.total_visits, 0)::bigint,
    coalesce(visit_metrics.total_spent, 0)::numeric,
    coalesce(
      contact.customer_segment,
      case
        when coalesce(visit_metrics.total_visits, 0) >= 4
          and coalesce(visit_metrics.total_spent, 0) >= 500 then 'VIP'
        when coalesce(visit_metrics.total_visits, 0) >= 3 then 'Frecuente'
        when visit_metrics.last_visit_at >= now() - interval '30 days' then 'Nuevo'
        else 'Ocasional'
      end
    )::text,
    visit_metrics.last_visit_at,
    last_service.name::text
  from public.crm_marketing_contacts as contact
  left join lateral (
    select
      count(distinct queue.campaign_id)
        filter (where queue.status in ('sent', 'enviado'))::bigint as campaigns_count,
      max(coalesce(queue.sent_at, queue.created_at))
        filter (where queue.status in ('sent', 'enviado')) as last_message_sent_at,
      max(coalesce(queue.sent_at, queue.created_at))
        filter (where queue.replied = true) as last_reply_at
    from public.crm_wa_queue as queue
    where queue.company_id = contact.company_id
      and (
        queue.contact_id = contact.id
        or queue.phone = contact.phone
      )
  ) as message_metrics on true
  left join lateral (
    select
      count(*) filter (where visit.status = 'completado')::bigint as total_visits,
      coalesce(
        sum(coalesce(payment_totals.amount_paid, 0))
          filter (where visit.status = 'completado'),
        0
      )::numeric as total_spent,
      max(coalesce(visit.completed_at, visit.visit_date))
        filter (where visit.status = 'completado') as last_visit_at
    from public.spa_visits as visit
    left join lateral (
      select coalesce(sum(payment.amount), 0)::numeric as amount_paid
      from public.spa_payments as payment
      where payment.company_id = visit.company_id
        and payment.visit_id = visit.id
    ) as payment_totals on true
    where visit.company_id = contact.company_id
      and visit.contact_id = contact.id
  ) as visit_metrics on true
  left join lateral (
    select service.name
    from public.spa_visits as visit
    join public.spa_services as service
      on service.company_id = visit.company_id
     and service.id = visit.service_id
    where visit.company_id = contact.company_id
      and visit.contact_id = contact.id
    order by coalesce(visit.completed_at, visit.scheduled_date, visit.visit_date) desc
    limit 1
  ) as last_service on true
  where contact.company_id = v_company_id
  order by contact.created_at desc;
end;
$function$;

revoke all on function public.rpc_get_clients_metrics()
  from public, anon;
grant execute on function public.rpc_get_clients_metrics()
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
