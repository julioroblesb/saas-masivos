begin;

do $$
declare
  missing_constraints text[];
begin
  select array_agg(required.constraint_name)
  into missing_constraints
  from (
    values
      ('spa_visits_contact_tenant_fkey'),
      ('spa_visits_service_tenant_fkey'),
      ('spa_visits_staff_tenant_fkey'),
      ('spa_payments_visit_tenant_fkey'),
      ('spa_followups_contact_tenant_fkey'),
      ('spa_followups_visit_tenant_fkey'),
      ('crm_queue_campaign_tenant_fkey'),
      ('crm_queue_contact_tenant_fkey'),
      ('crm_queue_visit_tenant_fkey'),
      ('spa_staff_blocks_staff_tenant_fkey'),
      ('spa_staff_schedules_staff_tenant_fkey'),
      ('spa_staff_services_staff_tenant_fkey'),
      ('spa_staff_services_service_tenant_fkey')
  ) as required(constraint_name)
  left join pg_constraint c
    on c.conname = required.constraint_name
    and c.connamespace = 'public'::regnamespace
  where c.oid is null
     or c.convalidated = false;

  if missing_constraints is not null then
    raise exception
      'No se puede continuar. Faltan constraints tenant o no están validadas: %',
      missing_constraints;
  end if;
end
$$;

alter table public.spa_visits
  drop constraint if exists spa_visits_contact_id_fkey,
  drop constraint if exists spa_visits_service_id_fkey,
  drop constraint if exists spa_visits_staff_id_fkey;

alter table public.spa_payments
  drop constraint if exists spa_payments_visit_id_fkey;

alter table public.spa_follow_ups
  drop constraint if exists spa_follow_ups_contact_id_fkey,
  drop constraint if exists spa_follow_ups_visit_id_fkey;

alter table public.crm_wa_queue
  drop constraint if exists crm_wa_queue_campaign_id_fkey,
  drop constraint if exists crm_wa_queue_contact_id_fkey,
  drop constraint if exists crm_wa_queue_visit_id_fkey;

alter table public.spa_staff_blocks
  drop constraint if exists spa_staff_blocks_staff_id_fkey;

alter table public.spa_staff_schedules
  drop constraint if exists spa_staff_schedules_staff_id_fkey;

alter table public.spa_staff_services
  drop constraint if exists spa_staff_services_staff_id_fkey,
  drop constraint if exists spa_staff_services_service_id_fkey;

notify pgrst, 'reload schema';

commit;
