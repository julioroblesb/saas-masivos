-- Safe production-schema smoke test: every fixture and mutation is rolled back.
begin;

insert into public.companies (
  id,
  name,
  status,
  plan_type,
  subscription_start_at,
  subscription_end_at,
  is_demo
)
values
  (
    '90000000-0000-4000-8000-000000000001',
    'Rollback Smoke Tenant A',
    'activa',
    'prueba',
    now(),
    now() + interval '1 day',
    true
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    'Rollback Smoke Tenant B',
    'activa',
    'prueba',
    now(),
    now() + interval '1 day',
    true
  );

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'rollback-owner-a@local.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'rollback-owner-b@local.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, company_id, role, full_name)
values
  (
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    'owner',
    'Rollback Owner A'
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000002',
    'owner',
    'Rollback Owner B'
  );

insert into public.crm_marketing_contacts (
  id,
  company_id,
  phone,
  name,
  opt_in_source
)
values
  (
    '92000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    '51910000001',
    'Rollback Contact A',
    'production_smoke'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000002',
    '51910000002',
    'Rollback Contact B',
    'production_smoke'
  );

do $$
declare
  v_count bigint;
  v_changed bigint;
  v_delete_result jsonb;
  v_employee_rejected boolean := false;
begin
  perform set_config(
    'request.jwt.claim.sub',
    '91000000-0000-4000-8000-000000000001',
    true
  );
  execute 'set local role authenticated';

  if public.auth_company_id() <>
    '90000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'RLS smoke: tenant context mismatch';
  end if;

  select count(*) into v_count
  from public.companies
  where id = '90000000-0000-4000-8000-000000000002';
  if v_count <> 0 then
    raise exception 'RLS smoke: cross-tenant company read';
  end if;

  update public.crm_marketing_contacts
  set name = name
  where id = '92000000-0000-4000-8000-000000000002';
  get diagnostics v_changed = row_count;
  if v_changed <> 0 then
    raise exception 'RLS smoke: cross-tenant contact update';
  end if;

  select public.rpc_delete_marketing_contact(
    '92000000-0000-4000-8000-000000000002'
  )
  into v_delete_result;
  if coalesce((v_delete_result->>'success')::boolean, false) then
    raise exception 'RLS smoke: cross-tenant delete RPC';
  end if;

  perform public.rpc_update_company_settings(null, null);

  execute 'reset role';
  update public.profiles
  set role = 'employee'
  where id = '91000000-0000-4000-8000-000000000001';
  execute 'set local role authenticated';

  begin
    perform public.rpc_update_company_settings(null, null);
  exception
    when insufficient_privilege then
      v_employee_rejected := true;
  end;
  if not v_employee_rejected then
    raise exception 'Role smoke: employee changed owner settings';
  end if;

  execute 'reset role';
  execute 'set local role anon';
  select count(*) into v_count from public.companies;
  if v_count <> 0 then
    raise exception 'RLS smoke: anonymous company read';
  end if;
  execute 'reset role';
end
$$;

insert into public.companies (
  id,
  name,
  status,
  plan_type,
  subscription_start_at,
  subscription_end_at
)
select
  ('93000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'Rollback Capacity Tenant ' || series,
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
  ('93000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  (51930000000 + series)::text,
  'rollback capacity smoke',
  'queued',
  now() - interval '1 second',
  now() - interval '1 second',
  'rollback-capacity-' || series,
  'transactional'
from generate_series(1, 20) as series;

do $$
declare
  v_claimed bigint;
begin
  select count(*) into v_claimed
  from generate_series(1, 20) as series
  cross join lateral public.rpc_claim_queue_item(
    ('93000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
    'rollback-worker-' || series,
    90,
    true
  );
  if v_claimed <> 20 then
    raise exception 'Queue smoke: expected 20 claims, got %', v_claimed;
  end if;

  select count(*) into v_claimed
  from generate_series(1, 20) as series
  cross join lateral public.rpc_claim_queue_item(
    ('93000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
    'rollback-second-worker-' || series,
    90,
    true
  );
  if v_claimed <> 0 then
    raise exception 'Queue smoke: duplicate claims detected';
  end if;

  if has_table_privilege('anon', 'public.app_audit_events', 'SELECT')
    or has_table_privilege('authenticated', 'public.app_audit_events', 'SELECT') then
    raise exception 'Audit smoke: audit log exposed to application roles';
  end if;
end
$$;

rollback;
