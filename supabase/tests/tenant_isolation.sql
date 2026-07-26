-- Run against a populated staging/production clone with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation.sql
--
-- The transaction never persists data. It selects two existing tenants,
-- impersonates a real authenticated user, and fails on any isolation breach.
begin;

do $$
declare
  v_user_a uuid;
  v_company_a uuid;
  v_company_b uuid;
  v_contact_b uuid;
  v_rows integer;
  v_result jsonb;
begin
  select p.id, p.company_id
    into v_user_a, v_company_a
  from public.profiles p
  where p.company_id is not null
  order by p.created_at
  limit 1;

  select p.company_id
    into v_company_b
  from public.profiles p
  where p.company_id is not null
    and p.company_id <> v_company_a
  order by p.created_at
  limit 1;

  select c.id
    into v_contact_b
  from public.crm_marketing_contacts c
  where c.company_id = v_company_b
  limit 1;

  if v_user_a is null or v_company_b is null or v_contact_b is null then
    raise exception 'The isolation test requires two populated tenants';
  end if;

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  execute 'set local role authenticated';

  if public.auth_company_id() is distinct from v_company_a then
    raise exception 'Authenticated tenant resolution failed';
  end if;

  if exists (select 1 from public.companies where id = v_company_b) then
    raise exception 'Cross-tenant company read detected';
  end if;

  if exists (
    select 1
    from public.crm_marketing_contacts
    where company_id = v_company_b
  ) then
    raise exception 'Cross-tenant contact read detected';
  end if;

  update public.crm_marketing_contacts
  set name = name
  where id = v_contact_b;
  get diagnostics v_rows = row_count;

  if v_rows <> 0 then
    raise exception 'Cross-tenant direct update detected';
  end if;

  select public.rpc_delete_marketing_contact(v_contact_b) into v_result;
  if coalesce((v_result->>'success')::boolean, false) then
    raise exception 'Cross-tenant delete RPC detected';
  end if;

  begin
    perform public.rpc_recalculate_customer_segment(v_contact_b);
    raise exception 'Cross-tenant segment RPC detected';
  exception
    when others then
      if sqlerrm <> 'Contact not found' then
        raise;
      end if;
  end;

  execute 'set local role anon';

  if exists (select 1 from public.companies) then
    raise exception 'Anonymous company read detected';
  end if;

  if exists (select 1 from public.crm_marketing_contacts) then
    raise exception 'Anonymous contact read detected';
  end if;

  execute 'reset role';
end
$$;

rollback;
