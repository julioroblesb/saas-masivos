alter table public.profiles
  drop constraint profiles_role_check;

-- Replace the ambiguous tenant role with explicit application roles.
update public.profiles
set role = 'owner'
where role = 'tenant';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'owner', 'employee'));

create or replace function public.auth_role()
returns text
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

revoke execute on function public.auth_role() from public, anon;
grant execute on function public.auth_role() to authenticated, service_role;

-- A single access context becomes the database boundary consumed by the
-- application TenantAccessService.
create or replace function public.rpc_get_my_access_context()
returns table (
  user_id uuid,
  company_id uuid,
  app_role text,
  company_status text,
  plan_type text,
  subscription_start_at timestamptz,
  subscription_end_at timestamptz,
  timezone text,
  is_demo boolean
)
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select
    p.id,
    p.company_id,
    p.role,
    c.status,
    c.plan_type,
    c.subscription_start_at,
    c.subscription_end_at,
    coalesce(c.settings->>'timezone', 'America/Lima'),
    coalesce(c.is_demo, false)
  from public.profiles p
  left join public.companies c on c.id = p.company_id
  where p.id = auth.uid()
$$;

revoke execute on function public.rpc_get_my_access_context()
  from public, anon;
grant execute on function public.rpc_get_my_access_context()
  to authenticated;

-- Company settings are an owner responsibility. Employees keep operational
-- access but cannot change commercial/company configuration through the RPC.
create or replace function public.rpc_update_company_settings(
  p_name text default null,
  p_settings jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid := public.auth_company_id();
begin
  if v_company_id is null or public.auth_role() <> 'owner' then
    raise exception 'Owner role required' using errcode = '42501';
  end if;

  update public.companies
  set
    name = coalesce(nullif(btrim(p_name), ''), name),
    settings = coalesce(p_settings, settings)
  where id = v_company_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Provisioning is atomic after the Auth user has been created. Only the
-- service role can call it; the application deletes the Auth user if this RPC
-- fails, so no orphaned identity remains.
create or replace function public.rpc_provision_tenant_for_user(
  p_user_id uuid,
  p_company_name text,
  p_owner_name text,
  p_plan_type text default 'prueba',
  p_subscription_end_at timestamptz default (now() + interval '7 days'),
  p_is_demo boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_company_id uuid;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Auth user not found';
  end if;

  if nullif(btrim(p_company_name), '') is null then
    raise exception 'Company name is required';
  end if;

  insert into public.companies (
    name,
    status,
    plan_type,
    subscription_start_at,
    subscription_end_at,
    is_demo
  )
  values (
    btrim(p_company_name),
    'activa',
    p_plan_type,
    now(),
    p_subscription_end_at,
    p_is_demo
  )
  returning id into v_company_id;

  insert into public.profiles (id, company_id, role, full_name)
  values (p_user_id, v_company_id, 'owner', nullif(btrim(p_owner_name), ''));

  return v_company_id;
end;
$$;

revoke execute on function public.rpc_provision_tenant_for_user(
  uuid, text, text, text, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.rpc_provision_tenant_for_user(
  uuid, text, text, text, timestamptz, boolean
) to service_role;

-- Commercial state and technical WhatsApp access change together.
create or replace function public.rpc_set_tenant_subscription(
  p_company_id uuid,
  p_status text,
  p_plan_type text,
  p_subscription_end_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.companies
  set
    status = p_status,
    plan_type = p_plan_type,
    subscription_end_at = p_subscription_end_at
  where id = p_company_id;

  if not found then
    raise exception 'Company not found';
  end if;

  if p_status <> 'activa' or p_subscription_end_at <= now() then
    update public.wa_sessions
    set
      status = 'desconectado',
      last_disconnect_reason = 'tenant_access_disabled',
      updated_at = now()
    where company_id = p_company_id;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.rpc_set_tenant_subscription(
  uuid, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.rpc_set_tenant_subscription(
  uuid, text, text, timestamptz
) to service_role;
