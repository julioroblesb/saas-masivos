create or replace function public.rpc_clone_demo_company(p_template_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_company_id uuid;
  v_template_company public.companies%rowtype;
  v_template_wa_session public.wa_sessions%rowtype;
  v_old_service_id uuid;
  v_new_service_id uuid;
  v_old_staff_id uuid;
  v_new_staff_id uuid;
  v_old_contact_id uuid;
  v_new_contact_id uuid;
  v_old_visit_id uuid;
  v_new_visit_id uuid;
begin
  select *
    into v_template_company
    from public.companies
   where id = p_template_company_id
   limit 1;

  if not found then
    raise exception 'Empresa plantilla no encontrada';
  end if;

  insert into public.companies (
    name,
    status,
    is_demo,
    settings,
    plan_type,
    subscription_start_at,
    subscription_end_at
  )
  values (
    v_template_company.name || ' (Invitado)',
    'activa',
    true,
    v_template_company.settings,
    'demo',
    now(),
    now() + interval '2 days'
  )
  returning id into v_new_company_id;

  select *
    into v_template_wa_session
    from public.wa_sessions
   where company_id = p_template_company_id
   limit 1;

  if found then
    insert into public.wa_sessions (
      company_id,
      status,
      phone_number,
      bb_project_id,
      bb_host,
      next_allowed_send_at,
      last_connected_at
    )
    values (
      v_new_company_id,
      v_template_wa_session.status,
      v_template_wa_session.phone_number,
      v_template_wa_session.bb_project_id,
      v_template_wa_session.bb_host,
      now(),
      now()
    );
  end if;

  insert into public.spa_products (
    company_id,
    name,
    description,
    price,
    stock,
    is_active,
    image_url,
    created_at,
    updated_at
  )
  select
    v_new_company_id,
    name,
    description,
    price,
    stock,
    is_active,
    image_url,
    created_at,
    updated_at
  from public.spa_products
  where company_id = p_template_company_id;

  create temporary table tmp_service_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_service_id in
    select id from public.spa_services where company_id = p_template_company_id
  loop
    insert into public.spa_services (
      company_id,
      name,
      description,
      price,
      min_price,
      promo_price,
      duration_days,
      care_instructions,
      care_image_url,
      is_active
    )
    select
      v_new_company_id,
      name,
      description,
      price,
      min_price,
      promo_price,
      duration_days,
      care_instructions,
      care_image_url,
      is_active
    from public.spa_services
    where id = v_old_service_id
    returning id into v_new_service_id;

    insert into tmp_service_map (old_id, new_id)
    values (v_old_service_id, v_new_service_id);
  end loop;

  create temporary table tmp_staff_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_staff_id in
    select id from public.spa_staff where company_id = p_template_company_id
  loop
    insert into public.spa_staff (company_id, name, birthday, role, is_active)
    select v_new_company_id, name, birthday, role, is_active
      from public.spa_staff
     where id = v_old_staff_id
    returning id into v_new_staff_id;

    insert into tmp_staff_map (old_id, new_id)
    values (v_old_staff_id, v_new_staff_id);
  end loop;

  insert into public.spa_staff_services (staff_id, service_id, company_id)
  select staff_map.new_id, service_map.new_id, v_new_company_id
    from public.spa_staff_services old_link
    join tmp_staff_map staff_map on staff_map.old_id = old_link.staff_id
    join tmp_service_map service_map on service_map.old_id = old_link.service_id
   where old_link.company_id = p_template_company_id;

  create temporary table tmp_contact_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_contact_id in
    select id
      from public.crm_marketing_contacts
     where company_id = p_template_company_id
  loop
    insert into public.crm_marketing_contacts (
      company_id,
      phone,
      name,
      tags,
      email,
      created_at
    )
    select v_new_company_id, phone, name, tags, email, created_at
      from public.crm_marketing_contacts
     where id = v_old_contact_id
    returning id into v_new_contact_id;

    insert into tmp_contact_map (old_id, new_id)
    values (v_old_contact_id, v_new_contact_id);
  end loop;

  create temporary table tmp_visit_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_visit_id in
    select id from public.spa_visits where company_id = p_template_company_id
  loop
    insert into public.spa_visits (
      company_id,
      contact_id,
      staff_id,
      service_id,
      status,
      visit_date,
      scheduled_date,
      price_charged,
      payment_status,
      completed_at,
      created_at
    )
    select
      v_new_company_id,
      contact_map.new_id,
      staff_map.new_id,
      service_map.new_id,
      visit.status,
      visit.visit_date,
      visit.scheduled_date,
      visit.price_charged,
      visit.payment_status,
      visit.completed_at,
      visit.created_at
    from public.spa_visits visit
    join tmp_contact_map contact_map on contact_map.old_id = visit.contact_id
    join tmp_service_map service_map on service_map.old_id = visit.service_id
    left join tmp_staff_map staff_map on staff_map.old_id = visit.staff_id
    where visit.id = v_old_visit_id
    returning id into v_new_visit_id;

    insert into tmp_visit_map (old_id, new_id)
    values (v_old_visit_id, v_new_visit_id);
  end loop;

  insert into public.spa_payments (
    company_id,
    visit_id,
    amount,
    payment_method,
    payment_date,
    notes,
    created_at,
    source
  )
  select
    v_new_company_id,
    visit_map.new_id,
    payment.amount,
    payment.payment_method,
    payment.payment_date,
    payment.notes,
    payment.created_at,
    payment.source
  from public.spa_payments payment
  join tmp_visit_map visit_map on visit_map.old_id = payment.visit_id
  where payment.company_id = p_template_company_id;

  return jsonb_build_object(
    'success', true,
    'new_company_id', v_new_company_id
  );
end;
$$;

revoke all on function public.rpc_clone_demo_company(uuid) from public, anon, authenticated;
grant execute on function public.rpc_clone_demo_company(uuid) to service_role;
