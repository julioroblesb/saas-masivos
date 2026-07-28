begin;

-- ============================================================================
-- FASE 2B: RPCs SEGURAS PARA WORKFLOWS DE NEGOCIO (SECURITY DEFINER + TENANT LOCK)
-- ============================================================================

-- 1. rpc_create_visit: Creación segura de citas con validación de tenant y suscripción
create or replace function public.rpc_create_visit(
  p_contact_id uuid,
  p_service_id uuid,
  p_staff_id uuid default null,
  p_visit_date timestamptz default null,
  p_price_charged numeric default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_effective_price numeric;
  v_service_price numeric;
  v_visit_id uuid;
begin
  if v_actor_id is null then raise exception 'Not authenticated'; end if;

  select company_id into v_company_id
    from public.profiles
   where id = v_actor_id;
  if v_company_id is null then raise exception 'Not authorized'; end if;

  if not exists (
    select 1 from public.companies
     where id = v_company_id
       and status = 'activa'
       and subscription_end_at > now()
  ) then raise exception 'La empresa no tiene acceso activo'; end if;

  -- Validar pertenencia del contacto a la empresa
  if not exists (
    select 1 from public.crm_marketing_contacts
     where id = p_contact_id and company_id = v_company_id and not coalesce(is_archived, false)
  ) then raise exception 'Contacto no encontrado o no pertenece a la empresa'; end if;

  -- Validar pertenencia del servicio a la empresa
  select price into v_service_price
    from public.spa_services
   where id = p_service_id and company_id = v_company_id;
  if not found then raise exception 'Servicio no encontrado o no pertenece a la empresa'; end if;

  -- Validar pertenencia del personal (staff) a la empresa si se especificó
  if p_staff_id is not null and not exists (
    select 1 from public.profiles
     where id = p_staff_id and company_id = v_company_id
  ) then raise exception 'Personal no encontrado o no pertenece a la empresa'; end if;

  v_effective_price := coalesce(p_price_charged, v_service_price, 0);
  if v_effective_price < 0 then raise exception 'El precio no puede ser negativo'; end if;

  insert into public.spa_visits (
    company_id,
    contact_id,
    service_id,
    staff_id,
    visit_date,
    scheduled_date,
    price_charged,
    status,
    payment_status,
    notes
  )
  values (
    v_company_id,
    p_contact_id,
    p_service_id,
    p_staff_id,
    coalesce(p_visit_date, now()),
    coalesce(p_visit_date, now()),
    v_effective_price,
    'agendado',
    'pendiente',
    nullif(trim(p_notes), '')
  )
  returning id into v_visit_id;

  return jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'company_id', v_company_id,
    'status', 'agendado',
    'price_charged', v_effective_price
  );
end;
$$;


-- 2. rpc_update_visit: Edición segura de citas existentes
create or replace function public.rpc_update_visit(
  p_visit_id uuid,
  p_service_id uuid default null,
  p_staff_id uuid default null,
  p_visit_date timestamptz default null,
  p_price_charged numeric default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_visit public.spa_visits%rowtype;
begin
  if v_actor_id is null then raise exception 'Not authenticated'; end if;

  select company_id into v_company_id
    from public.profiles
   where id = v_actor_id;
  if v_company_id is null then raise exception 'Not authorized'; end if;

  select *
    into v_visit
    from public.spa_visits
   where id = p_visit_id
     and company_id = v_company_id
   for update;
  if not found then raise exception 'Atención no encontrada'; end if;

  if v_visit.status in ('completado', 'cancelado', 'no_asistio') then
    raise exception 'No se puede editar una atención en estado %', v_visit.status;
  end if;

  if p_service_id is not null and not exists (
    select 1 from public.spa_services where id = p_service_id and company_id = v_company_id
  ) then raise exception 'Servicio inválido'; end if;

  if p_staff_id is not null and not exists (
    select 1 from public.profiles where id = p_staff_id and company_id = v_company_id
  ) then raise exception 'Personal inválido'; end if;

  if p_price_charged is not null and p_price_charged < 0 then
    raise exception 'El precio no puede ser negativo';
  end if;

  update public.spa_visits
     set service_id = coalesce(p_service_id, service_id),
         staff_id = coalesce(p_staff_id, staff_id),
         visit_date = coalesce(p_visit_date, visit_date),
         scheduled_date = coalesce(p_visit_date, scheduled_date),
         price_charged = coalesce(p_price_charged, price_charged),
         notes = coalesce(nullif(trim(p_notes), ''), notes)
   where id = p_visit_id;

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id
  );
end;
$$;


-- 3. rpc_reschedule_visit: Reprogramación segura de citas
create or replace function public.rpc_reschedule_visit(
  p_visit_id uuid,
  p_new_date timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_visit public.spa_visits%rowtype;
begin
  if v_actor_id is null then raise exception 'Not authenticated'; end if;
  if p_new_date is null then raise exception 'La nueva fecha es obligatoria'; end if;

  select company_id into v_company_id
    from public.profiles
   where id = v_actor_id;
  if v_company_id is null then raise exception 'Not authorized'; end if;

  select *
    into v_visit
    from public.spa_visits
   where id = p_visit_id
     and company_id = v_company_id
   for update;
  if not found then raise exception 'Atención no encontrada'; end if;

  if v_visit.status in ('completado', 'cancelado', 'no_asistio') then
    raise exception 'No se puede reprogramar una atención en estado %', v_visit.status;
  end if;

  update public.spa_visits
     set visit_date = p_new_date,
         scheduled_date = p_new_date
   where id = p_visit_id;

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id,
    'new_date', p_new_date
  );
end;
$$;


-- Permisos de ejecución
revoke all on function public.rpc_create_visit(uuid, uuid, uuid, timestamptz, numeric, text) from public, anon;
grant execute on function public.rpc_create_visit(uuid, uuid, uuid, timestamptz, numeric, text) to authenticated;

revoke all on function public.rpc_update_visit(uuid, uuid, uuid, timestamptz, numeric, text) from public, anon;
grant execute on function public.rpc_update_visit(uuid, uuid, uuid, timestamptz, numeric, text) to authenticated;

revoke all on function public.rpc_reschedule_visit(uuid, timestamptz) from public, anon;
grant execute on function public.rpc_reschedule_visit(uuid, timestamptz) to authenticated;

commit;
