-- Production security and performance hardening.
-- This migration is intentionally idempotent where PostgreSQL supports it.

-- Views must honor the caller's RLS policies.
alter view public.view_crm_profiles set (security_invoker = true);

-- Remove obsolete RPC overloads that accept caller-controlled tenant/user data.
drop function if exists public.search_contacts(uuid, text, integer, integer);
drop function if exists public.rpc_create_campaign(text, text, jsonb, jsonb, integer, integer, uuid);
drop function if exists public.rpc_upsert_marketing_contact(text, text, text[], text, text, text, text);
drop function if exists public.current_tenant_id();

-- RLS depends on this helper. Pin its namespace resolution so objects from a
-- caller-controlled search path can never shadow public/auth objects.
alter function public.auth_company_id()
  set search_path = public, auth, pg_temp;

-- Fix tenant isolation and a cancelled-status typo in the overlap check.
create or replace function public.check_visit_overlap(
  p_staff_id uuid,
  p_visit_date timestamptz,
  p_duration_minutes integer,
  p_exclude_visit_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid := public.auth_company_id();
  v_overlap_exists boolean;
begin
  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
    from public.spa_staff
    where id = p_staff_id
      and company_id = v_company_id
  ) then
    raise exception 'Staff member not found';
  end if;

  select exists (
    select 1
    from public.spa_visits
    where company_id = v_company_id
      and staff_id = p_staff_id
      and status not in ('cancelado', 'no_asistio')
      and (p_exclude_visit_id is null or id <> p_exclude_visit_id)
      and p_visit_date < (
        coalesce(scheduled_date, visit_date)
        + interval '1 minute' * coalesce(duration_minutes, 60)
      )
      and (
        p_visit_date + interval '1 minute' * p_duration_minutes
      ) > coalesce(scheduled_date, visit_date)
  )
  into v_overlap_exists;

  return v_overlap_exists;
end;
$$;

-- Prevent cross-tenant segment recalculation through guessed contact IDs.
create or replace function public.rpc_recalculate_customer_segment(p_contact_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid := public.auth_company_id();
  v_contact record;
  v_days_since_created integer;
  v_days_since_last_visit integer;
  v_months_active numeric;
  v_visits_per_month numeric;
  v_new_segment text;
begin
  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  select created_at, last_visit_date, total_visits
  into v_contact
  from public.crm_marketing_contacts
  where id = p_contact_id
    and company_id = v_company_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  v_days_since_created := extract(day from (now() - v_contact.created_at));
  v_days_since_last_visit := case
    when v_contact.last_visit_date is not null
      then extract(day from (now() - v_contact.last_visit_date))
    else v_days_since_created
  end;
  v_months_active := greatest(1, v_days_since_created / 30.0);
  v_visits_per_month := coalesce(v_contact.total_visits, 0) / v_months_active;

  v_new_segment := case
    when v_days_since_last_visit > 120 then 'Perdido'
    when v_days_since_last_visit > 60 then 'En Riesgo'
    when v_days_since_created <= 30 then 'Nuevo'
    when v_visits_per_month > 2 then 'VIP'
    when v_visits_per_month >= 1 then 'Frecuente'
    else 'Ocasional'
  end;

  update public.crm_marketing_contacts
  set customer_segment = v_new_segment
  where id = p_contact_id
    and company_id = v_company_id
    and customer_segment is distinct from v_new_segment;

  return v_new_segment;
end;
$$;

-- Keep settings updates behind a tenant-derived RPC and avoid a nonexistent
-- companies.updated_at column.
create or replace function public.rpc_update_company_settings(
  p_name text default null,
  p_settings jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid := public.auth_company_id();
begin
  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  update public.companies
  set
    name = coalesce(nullif(btrim(p_name), ''), name),
    settings = coalesce(p_settings, settings)
  where id = v_company_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Fix mutable search paths on the remaining privileged functions.
alter function public.rpc_create_campaign(text, text, jsonb, integer, integer)
  set search_path = public, pg_temp;
alter function public.rpc_delete_marketing_contacts_by_tag(text)
  set search_path = public, pg_temp;

-- SECURITY DEFINER functions must never inherit EXECUTE from PUBLIC.
revoke execute on function public.check_visit_overlap(uuid, timestamptz, integer, uuid) from public, anon;
revoke execute on function public.rpc_archive_contacts(uuid[], boolean) from public, anon;
revoke execute on function public.rpc_batch_insert_marketing_contacts(jsonb) from public, anon;
revoke execute on function public.rpc_cancel_campaign(uuid) from public, anon;
revoke execute on function public.rpc_cleanup_demo_companies() from public, anon, authenticated;
revoke execute on function public.rpc_clone_demo_company(uuid) from public, anon, authenticated;
revoke execute on function public.rpc_complete_visit(uuid) from public, anon;
revoke execute on function public.rpc_count_contacts_by_tag(text) from public, anon;
revoke execute on function public.rpc_create_campaign(text, text, jsonb, integer, integer) from public, anon;
revoke execute on function public.rpc_delete_marketing_contact(uuid) from public, anon;
revoke execute on function public.rpc_delete_marketing_contacts_by_tag(text) from public, anon;
revoke execute on function public.rpc_get_clients_metrics() from public, anon;
revoke execute on function public.rpc_get_spa_dashboard() from public, anon;
revoke execute on function public.rpc_get_unique_tags() from public, anon;
revoke execute on function public.rpc_recalculate_customer_segment(uuid) from public, anon;
revoke execute on function public.rpc_update_company_settings(text, jsonb) from public, anon;
revoke execute on function public.rpc_upsert_marketing_contact(text, text, text[], text, text, date, text, text, text, text) from public, anon;
revoke execute on function public.search_contacts(text) from public, anon;
revoke execute on function public.auth_company_id() from public, anon;
revoke execute on function public.increment_campaign_sent(uuid) from public, anon, authenticated;
revoke execute on function public.increment_campaign_failed(uuid) from public, anon, authenticated;

grant execute on function public.check_visit_overlap(uuid, timestamptz, integer, uuid) to authenticated;
grant execute on function public.rpc_archive_contacts(uuid[], boolean) to authenticated;
grant execute on function public.rpc_batch_insert_marketing_contacts(jsonb) to authenticated;
grant execute on function public.rpc_cancel_campaign(uuid) to authenticated;
grant execute on function public.rpc_cleanup_demo_companies() to service_role;
grant execute on function public.rpc_clone_demo_company(uuid) to service_role;
grant execute on function public.rpc_complete_visit(uuid) to authenticated;
grant execute on function public.rpc_count_contacts_by_tag(text) to authenticated;
grant execute on function public.rpc_create_campaign(text, text, jsonb, integer, integer) to authenticated;
grant execute on function public.rpc_delete_marketing_contact(uuid) to authenticated;
grant execute on function public.rpc_delete_marketing_contacts_by_tag(text) to authenticated;
grant execute on function public.rpc_get_clients_metrics() to authenticated;
grant execute on function public.rpc_get_spa_dashboard() to authenticated;
grant execute on function public.rpc_get_unique_tags() to authenticated;
grant execute on function public.rpc_recalculate_customer_segment(uuid) to authenticated;
grant execute on function public.rpc_update_company_settings(text, jsonb) to authenticated;
grant execute on function public.rpc_upsert_marketing_contact(text, text, text[], text, text, date, text, text, text, text) to authenticated;
grant execute on function public.search_contacts(text) to authenticated;
grant execute on function public.auth_company_id() to authenticated, service_role;
grant execute on function public.increment_campaign_sent(uuid) to service_role;
grant execute on function public.increment_campaign_failed(uuid) to service_role;

-- Tenant policies should never target PUBLIC/anon. UPDATE policies also need
-- WITH CHECK so a tenant cannot reassign a row to another company.
alter policy companies_tenant_select on public.companies to authenticated;
alter policy tenant_isolation_select on public.crm_marketing_contacts to authenticated;
alter policy tenant_isolation_select_camp on public.crm_wa_campaigns to authenticated;
alter policy crm_wa_queue_tenant_insert on public.crm_wa_queue to authenticated;
alter policy crm_wa_queue_tenant_update on public.crm_wa_queue
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy tenant_isolation_select_queue on public.crm_wa_queue to authenticated;
alter policy profiles_self_select on public.profiles
  to authenticated
  using (id = (select auth.uid()));
alter policy spa_follow_ups_tenant_select on public.spa_follow_ups to authenticated;
alter policy spa_payments_tenant_insert on public.spa_payments to authenticated;
alter policy spa_payments_tenant_select on public.spa_payments to authenticated;
alter policy spa_payments_tenant_update on public.spa_payments
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy spa_products_tenant_delete on public.spa_products to authenticated;
alter policy spa_products_tenant_insert on public.spa_products to authenticated;
alter policy spa_products_tenant_select on public.spa_products to authenticated;
alter policy spa_products_tenant_update on public.spa_products
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy spa_services_tenant_delete on public.spa_services to authenticated;
alter policy spa_services_tenant_insert on public.spa_services to authenticated;
alter policy spa_services_tenant_select on public.spa_services to authenticated;
alter policy spa_services_tenant_update on public.spa_services
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy spa_staff_tenant_all on public.spa_staff
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy spa_staff_blocks_delete on public.spa_staff_blocks to authenticated;
alter policy spa_staff_blocks_insert on public.spa_staff_blocks to authenticated;
alter policy spa_staff_blocks_select on public.spa_staff_blocks to authenticated;
alter policy spa_staff_blocks_update on public.spa_staff_blocks
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy spa_staff_schedules_delete on public.spa_staff_schedules to authenticated;
alter policy spa_staff_schedules_insert on public.spa_staff_schedules to authenticated;
alter policy spa_staff_schedules_select on public.spa_staff_schedules to authenticated;
alter policy spa_staff_schedules_update on public.spa_staff_schedules
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy spa_staff_services_all on public.spa_staff_services
  to authenticated
  using (
    exists (
      select 1 from public.spa_staff s
      where s.id = staff_id
        and s.company_id = public.auth_company_id()
    )
  )
  with check (
    exists (
      select 1 from public.spa_staff s
      where s.id = staff_id
        and s.company_id = public.auth_company_id()
    )
    and exists (
      select 1 from public.spa_services sv
      where sv.id = service_id
        and sv.company_id = public.auth_company_id()
    )
  );
drop policy if exists spa_staff_services_insert on public.spa_staff_services;
alter policy spa_visits_tenant_insert on public.spa_visits to authenticated;
alter policy spa_visits_tenant_select on public.spa_visits to authenticated;
alter policy spa_visits_tenant_update on public.spa_visits
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy wa_auth_state_tenant_delete on public.wa_auth_state to authenticated;
alter policy wa_auth_state_tenant_insert on public.wa_auth_state to authenticated;
alter policy wa_auth_state_tenant_select on public.wa_auth_state to authenticated;
alter policy wa_auth_state_tenant_update on public.wa_auth_state
  to authenticated
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
alter policy tenant_isolation_select_sessions on public.wa_sessions to authenticated;
alter policy spa_media_tenant_upload on storage.objects to authenticated;
alter policy spa_media_public_read on storage.objects
  to authenticated
  using (
    bucket_id = 'spa-media'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  );

-- Remove duplicate indexes and cover foreign keys used by tenant joins.
drop index if exists public.idx_crm_marketing_contacts_company;
drop index if exists public.idx_crm_marketing_contacts_tags;
drop index if exists public.idx_crm_wa_queue_campaign_status;
drop index if exists public.idx_crm_wa_queue_company_status;

create index if not exists crm_wa_campaigns_company_id_idx
  on public.crm_wa_campaigns (company_id);
create index if not exists crm_wa_queue_contact_id_idx
  on public.crm_wa_queue (contact_id);
create index if not exists crm_wa_queue_visit_id_idx
  on public.crm_wa_queue (visit_id);
create index if not exists profiles_company_id_idx
  on public.profiles (company_id);
create index if not exists spa_follow_ups_contact_id_idx
  on public.spa_follow_ups (contact_id);
create index if not exists spa_follow_ups_visit_id_idx
  on public.spa_follow_ups (visit_id);
create index if not exists spa_staff_company_id_idx
  on public.spa_staff (company_id);
create index if not exists spa_staff_services_service_id_idx
  on public.spa_staff_services (service_id);
create index if not exists spa_visits_service_id_idx
  on public.spa_visits (service_id);
create index if not exists spa_visits_staff_id_idx
  on public.spa_visits (staff_id);
