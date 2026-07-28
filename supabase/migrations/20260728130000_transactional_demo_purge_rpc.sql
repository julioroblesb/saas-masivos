begin;

-- Migration: 20260728130000_transactional_demo_purge_rpc.sql
-- Description: Atomic purge of demo tenants, their profiles and database audit event.
-- External cleanup (Evolution, Auth and Storage) remains in the server action after commit.

create or replace function public.rpc_purge_demo_tenants(
  p_company_ids uuid[],
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_num_ids integer;
  v_unique_count integer;
  v_actor_role text;
  v_matched_count integer;
  v_non_demo_count integer;
  v_purged_ids uuid[];
begin
  v_num_ids := coalesce(cardinality(p_company_ids), 0);

  if v_num_ids < 1 or v_num_ids > 100 then
    raise exception 'El parámetro p_company_ids debe contener entre 1 y 100 elementos.';
  end if;

  if exists (
    select 1
    from unnest(p_company_ids) as u(id)
    where u.id is null
  ) then
    raise exception 'La lista p_company_ids no puede contener valores nulos.';
  end if;

  select count(distinct u.id)
    into v_unique_count
    from unnest(p_company_ids) as u(id);

  if v_unique_count <> v_num_ids then
    raise exception 'La lista p_company_ids contiene IDs duplicados.';
  end if;

  select p.role
    into v_actor_role
    from public.profiles p
   where p.id = p_actor_id;

  if v_actor_role is distinct from 'super_admin' then
    raise exception 'Acceso denegado: solo un super_admin puede ejecutar esta operación.';
  end if;

  -- Lock every selected company in deterministic order.
  perform 1
    from public.companies c
   where c.id = any(p_company_ids)
   order by c.id
   for update;

  get diagnostics v_matched_count = row_count;

  if v_matched_count <> v_num_ids then
    raise exception 'Operación rechazada: algunas empresas no fueron encontradas en la base de datos.';
  end if;

  select count(*)
    into v_non_demo_count
    from public.companies c
   where c.id = any(p_company_ids)
     and coalesce(c.is_demo, false) is not true;

  if v_non_demo_count > 0 then
    raise exception 'Operación rechazada por seguridad: la lista incluye empresas reales.';
  end if;

  -- profiles.company_id has NO ACTION, so profiles must be removed first.
  -- Both deletes are inside this same PostgreSQL transaction.
  delete from public.profiles p
   where p.company_id = any(p_company_ids);

  with deleted as (
    delete from public.companies c
     where c.id = any(p_company_ids)
     returning c.id
  )
  select coalesce(array_agg(d.id order by d.id), array[]::uuid[])
    into v_purged_ids
    from deleted d;

  if cardinality(v_purged_ids) <> v_num_ids then
    raise exception 'La cantidad eliminada no coincide con la cantidad solicitada.';
  end if;

  insert into public.app_audit_events (
    actor_id,
    company_id,
    correlation_id,
    entity_id,
    entity_type,
    event_type,
    metadata,
    outcome
  )
  values (
    p_actor_id,
    null,
    pg_catalog.gen_random_uuid()::text,
    array_to_string(v_purged_ids, ','),
    'demo_tenants_batch',
    'superadmin.demo_tenant_purged',
    jsonb_build_object(
      'purged_count', cardinality(v_purged_ids),
      'company_ids', v_purged_ids
    ),
    'success'
  );

  return jsonb_build_object(
    'success', true,
    'purged_count', cardinality(v_purged_ids),
    'company_ids', v_purged_ids
  );
end;
$function$;

revoke all on function public.rpc_purge_demo_tenants(uuid[], uuid)
  from public, anon, authenticated;

grant execute on function public.rpc_purge_demo_tenants(uuid[], uuid)
  to service_role;

commit;
