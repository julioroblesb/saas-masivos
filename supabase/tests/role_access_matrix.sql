begin;

select plan(8);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;
select is(public.auth_role(), 'owner', 'owner role resolves');
select lives_ok(
  $$select public.rpc_update_company_settings(null, null)$$,
  'owner can update tenant settings'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;
select is(public.auth_role(), 'employee', 'employee role resolves');
select throws_ok(
  $$select public.rpc_update_company_settings(null, null)$$,
  '42501',
  'Owner role required',
  'employee cannot update owner-only settings'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
set local role authenticated;
select is(public.auth_role(), 'super_admin', 'superadmin role resolves');
reset role;

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_get_my_access_context()',
    'EXECUTE'
  ),
  'anonymous users cannot read an access context'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_provision_tenant_for_user(uuid,text,text,text,timestamptz,boolean)',
    'EXECUTE'
  ),
  'authenticated users cannot provision tenants'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_provision_tenant_for_user(uuid,text,text,text,timestamptz,boolean)',
    'EXECUTE'
  ),
  'service role can provision tenants'
);

select * from finish();
rollback;
