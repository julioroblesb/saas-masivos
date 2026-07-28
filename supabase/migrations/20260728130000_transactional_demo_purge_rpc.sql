-- Migration: 20260728130000_transactional_demo_purge_rpc.sql
-- Description: Transactional RPC to safely purge demo tenants, associated profiles, and audit event in a single atomic transaction.

create or replace function public.rpc_purge_demo_tenants(
  p_company_ids uuid[],
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_num_ids integer;
  v_unique_count integer;
  v_actor_role text;
  v_matched_count integer;
  v_non_demo_count integer;
  v_purged_ids uuid[];
  v_result jsonb;
begin
  -- 1. Validate parameter array length (1 to 100)
  v_num_ids := array_length(p_company_ids, 1);
  if v_num_ids is null or v_num_ids < 1 or v_num_ids > 100 then
    raise exception 'El parámetro p_company_ids debe contener entre 1 y 100 elementos.';
  end if;

  -- 2. Validate duplicate IDs
  select count(distinct unnest_id) into v_unique_count
  from unnest(p_company_ids) as unnest_id;

  if v_unique_count != v_num_ids then
    raise exception 'La lista p_company_ids contiene IDs duplicados.';
  end if;

  -- 3. Verify actor role is super_admin
  select role into v_actor_role
  from public.profiles
  where id = p_actor_id;

  if v_actor_role is null or v_actor_role != 'super_admin' then
    raise exception 'Acceso denegado: solo un super_admin puede ejecutar esta operación.';
  end if;

  -- 4. Lock targeted companies FOR UPDATE and verify existence
  select count(*) into v_matched_count
  from public.companies
  where id = any(p_company_ids)
  for update;

  if v_matched_count != v_num_ids then
    raise exception 'Operación rechazada: algunas empresas no fueron encontradas en la base de datos.';
  end if;

  -- 5. STRICT LOCK: Verify ALL matched companies are demo accounts
  select count(*) into v_non_demo_count
  from public.companies
  where id = any(p_company_ids)
    and coalesce(is_demo, false) != true;

  if v_non_demo_count > 0 then
    raise exception 'Operación rechazada por seguridad: la lista incluye empresas reales (is_demo != true).';
  end if;

  -- 6. Atomic deletion of profiles linked to demo companies
  delete from public.profiles
  where company_id = any(p_company_ids);

  -- 7. Atomic deletion of demo companies (ON DELETE CASCADE removes wa_sessions, crm, spa, etc.)
  delete from public.companies
  where id = any(p_company_ids)
  returning id into v_purged_ids;

  -- 8. Insert audit log event within same transaction
  insert into public.app_audit_events (
    actor_id,
    company_id,
    correlation_id,
    entity_id,
    entity_type,
    event_type,
    metadata,
    outcome
  ) values (
    p_actor_id,
    null,
    gen_random_uuid()::text,
    array_to_string(p_company_ids, ','),
    'demo_tenants_batch',
    'superadmin.demo_tenant_purged',
    jsonb_build_object(
      'purged_count', array_length(p_company_ids, 1),
      'company_ids', p_company_ids
    ),
    'success'
  );

  v_result := jsonb_build_object(
    'success', true,
    'purged_count', coalesce(array_length(v_purged_ids, 1), 0),
    'company_ids', coalesce(v_purged_ids, array[]::uuid[])
  );

  return v_result;
end;
$$;

-- Security Grants: Revoke from public, anon, authenticated and grant exclusively to service_role
revoke execute on function public.rpc_purge_demo_tenants(uuid[], uuid) from public, anon, authenticated;
grant execute on function public.rpc_purge_demo_tenants(uuid[], uuid) to service_role;
