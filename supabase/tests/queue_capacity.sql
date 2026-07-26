begin;

select plan(3);

insert into public.companies (
  id,
  name,
  status,
  plan_type,
  subscription_start_at,
  subscription_end_at
)
select
  ('30000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'Capacity tenant ' || series,
  'activa',
  'prueba',
  now(),
  now() + interval '1 day'
from generate_series(1, 20) as series;

insert into public.crm_wa_queue (
  company_id,
  phone,
  message,
  status,
  next_attempt_at,
  scheduled_for,
  idempotency_key,
  message_type
)
select
  ('30000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  (51900000000 + series)::text,
  'capacity test',
  'queued',
  now() - interval '1 second',
  now() - interval '1 second',
  'capacity-' || series,
  'transactional'
from generate_series(1, 20) as series;

create temporary table claimed_capacity_items as
select claimed.id, claimed.company_id
from generate_series(1, 20) as series
cross join lateral public.rpc_claim_queue_item(
  ('30000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'capacity-worker-' || series,
  90,
  true
) as claimed;

select is(
  (select count(*) from claimed_capacity_items),
  20::bigint,
  'one transactional item is claimed for each of 20 tenants'
);
select is(
  (select count(distinct company_id) from claimed_capacity_items),
  20::bigint,
  'claims preserve tenant fairness'
);
select is(
  (
    select count(*)
    from generate_series(1, 20) as series
    cross join lateral public.rpc_claim_queue_item(
      ('30000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
      'second-capacity-worker-' || series,
      90,
      true
    )
  ),
  0::bigint,
  'active leases prevent duplicate claims across 20 tenants'
);

select * from finish();
rollback;
