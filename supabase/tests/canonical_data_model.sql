-- Destructive test cases are contained in a transaction and rolled back.
begin;

do $$
declare
  v_company_a uuid;
  v_company_b uuid;
  v_contact_a uuid;
  v_service_b uuid;
  v_rejected boolean;
begin
  select c.company_id, c.id
    into v_company_a, v_contact_a
  from public.crm_marketing_contacts c
  order by c.created_at
  limit 1;

  select s.company_id, s.id
    into v_company_b, v_service_b
  from public.spa_services s
  where s.company_id <> v_company_a
  order by s.created_at
  limit 1;

  if v_company_a is null or v_company_b is null then
    raise exception 'The canonical model test requires two populated tenants';
  end if;

  v_rejected := false;
  begin
    insert into public.spa_visits (
      company_id, contact_id, service_id, status
    )
    values (v_company_a, v_contact_a, v_service_b, 'agendado');
  exception
    when foreign_key_violation then
      v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Cross-tenant visit relationship was accepted';
  end if;

  v_rejected := false;
  begin
    insert into public.spa_products (company_id, name, price, stock)
    values (v_company_a, 'invalid-test-product', -1, 0);
  exception
    when check_violation then
      v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Negative product price was accepted';
  end if;

  if exists (
    select 1
    from public.crm_marketing_contacts
    where phone_normalized is null
      or length(phone_normalized) not between 8 and 15
  ) then
    raise exception 'Invalid normalized phone detected';
  end if;
end
$$;

rollback;
