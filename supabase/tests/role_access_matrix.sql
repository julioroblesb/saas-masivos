-- Run after identity_roles_and_access. All role changes are rolled back.
begin;

do $$
declare
  v_owner_id uuid;
  v_company_id uuid;
  v_superadmin_id uuid;
  v_rejected boolean;
begin
  select id, company_id
    into v_owner_id, v_company_id
  from public.profiles
  where role = 'owner'
  order by created_at
  limit 1;

  select id
    into v_superadmin_id
  from public.profiles
  where role = 'super_admin'
  order by created_at
  limit 1;

  if v_owner_id is null or v_superadmin_id is null then
    raise exception 'Role matrix requires an owner and a superadmin';
  end if;

  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  execute 'set local role authenticated';

  if public.auth_role() <> 'owner' then
    raise exception 'Owner role resolution failed';
  end if;

  perform public.rpc_update_company_settings(null, null);

  execute 'reset role';
  update public.profiles set role = 'employee' where id = v_owner_id;
  execute 'set local role authenticated';

  if public.auth_role() <> 'employee' then
    raise exception 'Employee role resolution failed';
  end if;

  if not exists (
    select 1 from public.companies where id = v_company_id
  ) then
    raise exception 'Employee lost operational tenant read access';
  end if;

  v_rejected := false;
  begin
    perform public.rpc_update_company_settings(null, null);
  exception
    when insufficient_privilege then
      v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Employee changed owner-only settings';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', v_superadmin_id::text, true);
  execute 'set local role authenticated';

  if public.auth_role() <> 'super_admin' then
    raise exception 'Superadmin role resolution failed';
  end if;

  execute 'set local role anon';
  v_rejected := false;
  begin
    perform public.rpc_get_my_access_context();
  exception
    when insufficient_privilege then
      v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Anonymous access context was exposed';
  end if;

  execute 'reset role';

  if has_function_privilege(
    'authenticated',
    'public.rpc_provision_tenant_for_user(uuid,text,text,text,timestamptz,boolean)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role can provision tenants';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.rpc_provision_tenant_for_user(uuid,text,text,text,timestamptz,boolean)',
    'EXECUTE'
  ) then
    raise exception 'Service role cannot provision tenants';
  end if;
end
$$;

rollback;
