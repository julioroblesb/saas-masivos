begin;

-- ============================================================================
-- FASE 2B CORREGIDA: RPCs SEGURAS PARA CITAS
-- Reemplaza íntegramente 20260728110000_security_phase2_rpcs.sql
-- No ejecutar la versión anterior.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Crear cita
-- --------------------------------------------------------------------------
create or replace function public.rpc_create_visit(
  p_contact_id uuid,
  p_service_id uuid,
  p_staff_id uuid default null,
  p_visit_date timestamptz default null,
  p_price_charged numeric default null,
  p_notes text default null,
  p_duration_minutes integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_service_price numeric;
  v_service_min_price numeric;
  v_effective_price numeric;
  v_visit_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.company_id
    into v_company_id
    from public.profiles p
   where p.id = v_actor_id;

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
      from public.companies c
     where c.id = v_company_id
       and c.status = 'activa'
       and c.subscription_end_at > now()
  ) then
    raise exception 'La empresa no tiene acceso activo';
  end if;

  if p_visit_date is null then
    raise exception 'La fecha de la cita es obligatoria';
  end if;

  if p_duration_minutes is null or p_duration_minutes not between 1 and 1440 then
    raise exception 'La duración debe estar entre 1 y 1440 minutos';
  end if;

  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Las notas exceden el límite de 5000 caracteres';
  end if;

  if not exists (
    select 1
      from public.crm_marketing_contacts c
     where c.id = p_contact_id
       and c.company_id = v_company_id
       and not coalesce(c.is_archived, false)
  ) then
    raise exception 'Contacto no encontrado o no pertenece a la empresa';
  end if;

  select s.price, coalesce(s.min_price, 0)
    into v_service_price, v_service_min_price
    from public.spa_services s
   where s.id = p_service_id
     and s.company_id = v_company_id
     and coalesce(s.is_active, true);

  if not found then
    raise exception 'Servicio no encontrado, inactivo o ajeno a la empresa';
  end if;

  v_effective_price := coalesce(p_price_charged, v_service_price);

  if v_effective_price is null or v_effective_price < v_service_min_price then
    raise exception 'El precio no puede ser menor al precio mínimo del servicio';
  end if;

  if p_staff_id is not null then
    -- La fila del especialista se bloquea para serializar citas concurrentes.
    perform 1
      from public.spa_staff s
     where s.id = p_staff_id
       and s.company_id = v_company_id
       and coalesce(s.is_active, true)
     for update;

    if not found then
      raise exception 'Personal no encontrado, inactivo o ajeno a la empresa';
    end if;

    if public.check_visit_overlap(
      p_staff_id,
      p_visit_date,
      p_duration_minutes,
      null
    ) then
      raise exception 'El especialista ya tiene una cita que se cruza con ese horario';
    end if;
  end if;

  insert into public.spa_visits (
    company_id,
    contact_id,
    service_id,
    staff_id,
    visit_date,
    scheduled_date,
    duration_minutes,
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
    p_visit_date,
    p_visit_date,
    p_duration_minutes,
    v_effective_price,
    'agendado',
    'pendiente',
    nullif(trim(p_notes), '')
  )
  returning id into v_visit_id;

  return jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'status', 'agendado',
    'duration_minutes', p_duration_minutes,
    'price_charged', v_effective_price
  );
end;
$function$;


-- --------------------------------------------------------------------------
-- 2. Editar cita
-- p_staff_id representa el valor final: UUID para asignar o NULL para quitar.
-- p_status solo acepta estados editables; completar/cancelar/no asistir usan RPCs
-- dedicadas.
-- --------------------------------------------------------------------------
create or replace function public.rpc_update_visit(
  p_visit_id uuid,
  p_service_id uuid default null,
  p_staff_id uuid default null,
  p_visit_date timestamptz default null,
  p_price_charged numeric default null,
  p_notes text default null,
  p_duration_minutes integer default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_visit public.spa_visits%rowtype;
  v_effective_service_id uuid;
  v_effective_staff_id uuid;
  v_effective_date timestamptz;
  v_effective_duration integer;
  v_effective_price numeric;
  v_effective_status text;
  v_service_min_price numeric;
  v_total_paid numeric;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.company_id
    into v_company_id
    from public.profiles p
   where p.id = v_actor_id;

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
      from public.companies c
     where c.id = v_company_id
       and c.status = 'activa'
       and c.subscription_end_at > now()
  ) then
    raise exception 'La empresa no tiene acceso activo';
  end if;

  select *
    into v_visit
    from public.spa_visits v
   where v.id = p_visit_id
     and v.company_id = v_company_id
   for update;

  if not found then
    raise exception 'Atención no encontrada';
  end if;

  if v_visit.status in ('completado', 'cancelado', 'no_asistio') then
    raise exception 'No se puede editar una atención en estado %', v_visit.status;
  end if;

  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Las notas exceden el límite de 5000 caracteres';
  end if;

  v_effective_service_id := coalesce(p_service_id, v_visit.service_id);
  v_effective_staff_id := p_staff_id;
  v_effective_date := coalesce(p_visit_date, v_visit.visit_date, v_visit.scheduled_date);
  v_effective_duration := coalesce(p_duration_minutes, v_visit.duration_minutes, 60);
  v_effective_status := coalesce(p_status, v_visit.status);

  if v_effective_date is null then
    raise exception 'La fecha de la cita es obligatoria';
  end if;

  if v_effective_duration not between 1 and 1440 then
    raise exception 'La duración debe estar entre 1 y 1440 minutos';
  end if;

  if v_effective_status not in ('agendado', 'en_curso') then
    raise exception 'Estado editable inválido';
  end if;

  select coalesce(s.min_price, 0)
    into v_service_min_price
    from public.spa_services s
   where s.id = v_effective_service_id
     and s.company_id = v_company_id
     and coalesce(s.is_active, true);

  if not found then
    raise exception 'Servicio no encontrado, inactivo o ajeno a la empresa';
  end if;

  v_effective_price := coalesce(p_price_charged, v_visit.price_charged);

  if v_effective_price is null or v_effective_price < v_service_min_price then
    raise exception 'El precio no puede ser menor al precio mínimo del servicio';
  end if;

  select coalesce(sum(p.amount), 0)
    into v_total_paid
    from public.spa_payments p
   where p.company_id = v_company_id
     and p.visit_id = p_visit_id;

  if v_effective_price < v_total_paid then
    raise exception 'El precio no puede ser menor al total ya pagado';
  end if;

  if v_effective_staff_id is not null then
    perform 1
      from public.spa_staff s
     where s.id = v_effective_staff_id
       and s.company_id = v_company_id
       and coalesce(s.is_active, true)
     for update;

    if not found then
      raise exception 'Personal no encontrado, inactivo o ajeno a la empresa';
    end if;

    if public.check_visit_overlap(
      v_effective_staff_id,
      v_effective_date,
      v_effective_duration,
      p_visit_id
    ) then
      raise exception 'El especialista ya tiene una cita que se cruza con ese horario';
    end if;
  end if;

  update public.spa_visits
     set service_id = v_effective_service_id,
         staff_id = v_effective_staff_id,
         visit_date = v_effective_date,
         scheduled_date = v_effective_date,
         duration_minutes = v_effective_duration,
         price_charged = v_effective_price,
         status = v_effective_status,
         notes = case
           when p_notes is null then notes
           else nullif(trim(p_notes), '')
         end
   where id = p_visit_id
     and company_id = v_company_id;

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id,
    'status', v_effective_status,
    'duration_minutes', v_effective_duration,
    'price_charged', v_effective_price
  );
end;
$function$;


-- --------------------------------------------------------------------------
-- 3. Reprogramar cita
-- --------------------------------------------------------------------------
create or replace function public.rpc_reschedule_visit(
  p_visit_id uuid,
  p_new_date timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_visit public.spa_visits%rowtype;
  v_duration integer;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_new_date is null then
    raise exception 'La nueva fecha es obligatoria';
  end if;

  select p.company_id
    into v_company_id
    from public.profiles p
   where p.id = v_actor_id;

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
      from public.companies c
     where c.id = v_company_id
       and c.status = 'activa'
       and c.subscription_end_at > now()
  ) then
    raise exception 'La empresa no tiene acceso activo';
  end if;

  select *
    into v_visit
    from public.spa_visits v
   where v.id = p_visit_id
     and v.company_id = v_company_id
   for update;

  if not found then
    raise exception 'Atención no encontrada';
  end if;

  if v_visit.status in ('completado', 'cancelado', 'no_asistio') then
    raise exception 'No se puede reprogramar una atención en estado %', v_visit.status;
  end if;

  v_duration := coalesce(v_visit.duration_minutes, 60);

  if v_visit.staff_id is not null then
    perform 1
      from public.spa_staff s
     where s.id = v_visit.staff_id
       and s.company_id = v_company_id
       and coalesce(s.is_active, true)
     for update;

    if not found then
      raise exception 'El personal asignado ya no existe o está inactivo';
    end if;

    if public.check_visit_overlap(
      v_visit.staff_id,
      p_new_date,
      v_duration,
      p_visit_id
    ) then
      raise exception 'El especialista ya tiene una cita que se cruza con ese horario';
    end if;
  end if;

  update public.spa_visits
     set visit_date = p_new_date,
         scheduled_date = p_new_date
   where id = p_visit_id
     and company_id = v_company_id;

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id,
    'new_date', p_new_date
  );
end;
$function$;


-- --------------------------------------------------------------------------
-- Permisos
-- --------------------------------------------------------------------------
revoke all on function public.rpc_create_visit(
  uuid, uuid, uuid, timestamptz, numeric, text, integer
) from public, anon, authenticated;
grant execute on function public.rpc_create_visit(
  uuid, uuid, uuid, timestamptz, numeric, text, integer
) to authenticated;

revoke all on function public.rpc_update_visit(
  uuid, uuid, uuid, timestamptz, numeric, text, integer, text
) from public, anon, authenticated;
grant execute on function public.rpc_update_visit(
  uuid, uuid, uuid, timestamptz, numeric, text, integer, text
) to authenticated;

revoke all on function public.rpc_reschedule_visit(
  uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.rpc_reschedule_visit(
  uuid, timestamptz
) to authenticated;

commit;
