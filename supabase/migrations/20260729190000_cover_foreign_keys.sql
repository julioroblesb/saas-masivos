-- Cover every public foreign key used by tenant-scoped workflows.
-- Besides faster joins, these indexes prevent parent updates/deletes from
-- scanning complete child tables as tenant data grows.

create index if not exists idx_wa_queue_campaign_company
  on public.crm_wa_queue (campaign_id, company_id);

create index if not exists idx_wa_queue_contact_company
  on public.crm_wa_queue (contact_id, company_id);

create index if not exists idx_wa_queue_visit_company
  on public.crm_wa_queue (visit_id, company_id);

create index if not exists idx_demo_leads_follow_up_queue
  on public.demo_leads (follow_up_queue_id);

create index if not exists idx_demo_leads_info_queue
  on public.demo_leads (info_queue_id);

create index if not exists idx_demo_leads_welcome_queue
  on public.demo_leads (welcome_queue_id);

create index if not exists idx_follow_ups_contact_company
  on public.spa_follow_ups (contact_id, company_id);

create index if not exists idx_follow_ups_visit_company
  on public.spa_follow_ups (visit_id, company_id);

create index if not exists idx_payments_visit_company
  on public.spa_payments (visit_id, company_id);

create index if not exists idx_staff_blocks_staff_company
  on public.spa_staff_blocks (staff_id, company_id);

create index if not exists idx_staff_schedules_staff_company
  on public.spa_staff_schedules (staff_id, company_id);

create index if not exists idx_staff_services_company
  on public.spa_staff_services (company_id);

create index if not exists idx_staff_services_service_company
  on public.spa_staff_services (service_id, company_id);

create index if not exists idx_staff_services_staff_company
  on public.spa_staff_services (staff_id, company_id);

create index if not exists idx_visit_events_actor
  on public.spa_visit_events (actor_id);

create index if not exists idx_visit_events_visit_company
  on public.spa_visit_events (visit_id, company_id);

create index if not exists idx_visits_contact_company
  on public.spa_visits (contact_id, company_id);

create index if not exists idx_visits_service_company
  on public.spa_visits (service_id, company_id);

create index if not exists idx_visits_staff_company
  on public.spa_visits (staff_id, company_id);
