begin;

select plan(7);

select has_table('public', 'crm_marketing_contacts', 'contacts table exists');
select has_table('public', 'crm_wa_queue', 'durable queue table exists');
select col_type_is(
  'public',
  'crm_marketing_contacts',
  'birthday',
  'date',
  'birthdays use a real date type'
);
select col_type_is(
  'public',
  'crm_marketing_contacts',
  'phone_normalized',
  'text',
  'normalized phones use a canonical text representation'
);
select has_index(
  'public',
  'crm_marketing_contacts',
  'crm_contacts_company_phone_normalized_uidx',
  'contacts are unique by tenant and normalized phone'
);
select throws_ok(
  $$
    insert into public.spa_products (company_id, name, price, stock)
    values (
      '00000000-0000-4000-8000-000000000001',
      'invalid-test-product',
      -1,
      0
    )
  $$,
  '23514',
  null,
  'negative product prices are rejected'
);
select throws_ok(
  $$
    insert into public.spa_visits (
      company_id,
      contact_id,
      service_id,
      status
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000021',
      'agendado'
    )
  $$,
  '23503',
  null,
  'cross-tenant visit relationships are rejected'
);

select * from finish();
rollback;
