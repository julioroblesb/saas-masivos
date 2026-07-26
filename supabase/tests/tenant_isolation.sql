begin;

select plan(8);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(public.auth_company_id(), '00000000-0000-4000-8000-000000000001'::uuid, 'tenant resolves');
select is((select count(*) from public.companies), 1::bigint, 'owner sees only its company');
select is(
  (
    select count(*)
    from public.companies
    where id = '00000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'owner cannot read tenant B'
);
select is(
  (
    select count(*)
    from public.crm_marketing_contacts
    where company_id = '00000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'owner cannot read tenant B contacts'
);
select is(
  (
    with changed as (
      update public.crm_marketing_contacts
      set name = name
      where id = '00000000-0000-4000-8000-000000000011'
      returning id
    )
    select count(*) from changed
  ),
  0::bigint,
  'owner cannot update tenant B contacts'
);
select is(
  coalesce(
    (
      public.rpc_delete_marketing_contact(
        '00000000-0000-4000-8000-000000000011'
      )
    )->>'success',
    'false'
  ),
  'false',
  'cross-tenant delete RPC is rejected'
);

reset role;
set local role anon;
select is((select count(*) from public.companies), 0::bigint, 'anonymous company reads are blocked');
select is(
  (select count(*) from public.crm_marketing_contacts),
  0::bigint,
  'anonymous contact reads are blocked'
);

select * from finish();
rollback;
