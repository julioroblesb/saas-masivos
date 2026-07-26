-- Canonical, additive data model. Constraints are added NOT VALID first where
-- supported, then validated after the existing production data has passed the
-- preflight audit.

-- Preserve the original phone for compatibility while exposing a canonical
-- digits-only value for matching, uniqueness, and provider adapters.
alter table public.crm_marketing_contacts
  add column if not exists phone_normalized text
  generated always as (regexp_replace(phone, '[^0-9]', '', 'g')) stored;

create unique index if not exists crm_contacts_company_phone_normalized_uidx
  on public.crm_marketing_contacts (company_id, phone_normalized);

-- Make tenant ownership explicit on the staff/service junction so both
-- references can be checked against the same company.
alter table public.spa_staff_services
  add column if not exists company_id uuid;

update public.spa_staff_services ss
set company_id = s.company_id
from public.spa_staff s
where s.id = ss.staff_id
  and ss.company_id is null;

alter table public.spa_staff_services
  alter column company_id set not null;

-- Composite candidate keys support database-native tenant integrity.
alter table public.crm_marketing_contacts
  add constraint crm_contacts_id_company_key unique (id, company_id);
alter table public.crm_wa_campaigns
  add constraint crm_campaigns_id_company_key unique (id, company_id);
alter table public.spa_services
  add constraint spa_services_id_company_key unique (id, company_id);
alter table public.spa_staff
  add constraint spa_staff_id_company_key unique (id, company_id);
alter table public.spa_visits
  add constraint spa_visits_id_company_key unique (id, company_id);

alter table public.spa_visits
  add constraint spa_visits_contact_tenant_fkey
  foreign key (contact_id, company_id)
  references public.crm_marketing_contacts (id, company_id)
  on delete cascade
  not valid,
  add constraint spa_visits_service_tenant_fkey
  foreign key (service_id, company_id)
  references public.spa_services (id, company_id)
  on delete restrict
  not valid,
  add constraint spa_visits_staff_tenant_fkey
  foreign key (staff_id, company_id)
  references public.spa_staff (id, company_id)
  on delete set null (staff_id)
  not valid;

alter table public.spa_payments
  add constraint spa_payments_visit_tenant_fkey
  foreign key (visit_id, company_id)
  references public.spa_visits (id, company_id)
  on delete cascade
  not valid;

alter table public.spa_follow_ups
  add constraint spa_followups_contact_tenant_fkey
  foreign key (contact_id, company_id)
  references public.crm_marketing_contacts (id, company_id)
  on delete cascade
  not valid,
  add constraint spa_followups_visit_tenant_fkey
  foreign key (visit_id, company_id)
  references public.spa_visits (id, company_id)
  on delete cascade
  not valid;

alter table public.crm_wa_queue
  add constraint crm_queue_campaign_tenant_fkey
  foreign key (campaign_id, company_id)
  references public.crm_wa_campaigns (id, company_id)
  on delete cascade
  not valid,
  add constraint crm_queue_contact_tenant_fkey
  foreign key (contact_id, company_id)
  references public.crm_marketing_contacts (id, company_id)
  not valid,
  add constraint crm_queue_visit_tenant_fkey
  foreign key (visit_id, company_id)
  references public.spa_visits (id, company_id)
  on delete set null (visit_id)
  not valid;

alter table public.spa_staff_blocks
  add constraint spa_staff_blocks_staff_tenant_fkey
  foreign key (staff_id, company_id)
  references public.spa_staff (id, company_id)
  on delete cascade
  not valid;

alter table public.spa_staff_schedules
  add constraint spa_staff_schedules_staff_tenant_fkey
  foreign key (staff_id, company_id)
  references public.spa_staff (id, company_id)
  on delete cascade
  not valid;

alter table public.spa_staff_services
  add constraint spa_staff_services_company_fkey
  foreign key (company_id)
  references public.companies (id)
  on delete cascade
  not valid,
  add constraint spa_staff_services_staff_tenant_fkey
  foreign key (staff_id, company_id)
  references public.spa_staff (id, company_id)
  on delete cascade
  not valid,
  add constraint spa_staff_services_service_tenant_fkey
  foreign key (service_id, company_id)
  references public.spa_services (id, company_id)
  on delete cascade
  not valid;

-- Controlled vocabularies stay as text plus CHECK constraints to keep future
-- additions deployable without PostgreSQL enum migrations.
alter table public.companies
  add constraint companies_status_valid
  check (status in ('activa', 'suspendida', 'cancelada')) not valid,
  add constraint companies_plan_type_valid
  check (
    plan_type is null
    or plan_type in (
      'demo', 'prueba', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'
    )
  ) not valid,
  add constraint companies_subscription_dates_valid
  check (
    subscription_end_at is null
    or subscription_start_at is null
    or subscription_end_at >= subscription_start_at
  ) not valid;

alter table public.crm_marketing_contacts
  add constraint crm_contacts_phone_valid
  check (
    phone ~ '^[+]?[0-9]{8,15}$'
    and length(phone_normalized) between 8 and 15
  ) not valid,
  add constraint crm_contacts_totals_valid
  check (coalesce(total_spent, 0) >= 0 and coalesce(total_visits, 0) >= 0)
  not valid;

alter table public.crm_wa_campaigns
  add constraint crm_campaigns_status_valid
  check (
    status in (
      'borrador', 'queued', 'running', 'paused', 'completed', 'cancelada',
      'cancelled', 'failed'
    )
  ) not valid,
  add constraint crm_campaigns_delays_valid
  check (
    coalesce(min_delay_sec, 10) >= 10
    and coalesce(max_delay_sec, min_delay_sec, 10) >= coalesce(min_delay_sec, 10)
  ) not valid,
  add constraint crm_campaigns_counts_valid
  check (
    coalesce(total_contacts, 0) >= 0
    and coalesce(sent_count, 0) >= 0
    and coalesce(failed_count, 0) >= 0
    and coalesce(replied_count, 0) >= 0
  ) not valid;

alter table public.crm_wa_queue
  add constraint crm_queue_status_valid
  check (
    status in (
      'pendiente', 'enviando', 'enviado', 'fallido', 'cancelado',
      'queued', 'leased', 'processing', 'retry_scheduled', 'failed',
      'dead_letter', 'cancelled'
    )
  ) not valid,
  add constraint crm_queue_delay_valid
  check (delay_after_ms is null or delay_after_ms >= 0) not valid;

alter table public.spa_services
  add constraint spa_services_values_valid
  check (
    price >= 0
    and coalesce(min_price, 0) >= 0
    and coalesce(promo_price, 0) >= 0
    and duration_days >= 0
  ) not valid;

alter table public.spa_products
  add constraint spa_products_values_valid
  check (price >= 0 and coalesce(stock, 0) >= 0) not valid;

alter table public.spa_visits
  add constraint spa_visits_values_valid
  check (
    coalesce(duration_minutes, 60) > 0
    and coalesce(price_charged, 0) >= 0
  ) not valid,
  add constraint spa_visits_payment_status_valid
  check (
    payment_status is null
    or payment_status in ('pendiente', 'parcial', 'pagado')
  ) not valid;

alter table public.spa_payments
  add constraint spa_payments_amount_valid
  check (amount > 0) not valid;

alter table public.spa_staff_schedules
  add constraint spa_staff_schedules_times_valid
  check (not is_working or start_time < end_time) not valid;

alter table public.spa_staff_blocks
  add constraint spa_staff_blocks_times_valid
  check (start_time < end_time) not valid;

alter table public.wa_sessions
  add constraint wa_sessions_status_valid
  check (
    status in (
      'desconectado', 'conectando', 'esperando_qr', 'generando_qr',
      'provisionando', 'conectado', 'error', 'error_desconexion'
    )
  ) not valid,
  add constraint wa_sessions_daily_count_valid
  check (coalesce(daily_sent_count, 0) >= 0) not valid;

-- Validate only after every constraint exists, keeping the definition
-- reproducible while minimizing heavyweight locks.
alter table public.spa_visits
  validate constraint spa_visits_contact_tenant_fkey,
  validate constraint spa_visits_service_tenant_fkey,
  validate constraint spa_visits_staff_tenant_fkey,
  validate constraint spa_visits_values_valid,
  validate constraint spa_visits_payment_status_valid;
alter table public.spa_payments
  validate constraint spa_payments_visit_tenant_fkey,
  validate constraint spa_payments_amount_valid;
alter table public.spa_follow_ups
  validate constraint spa_followups_contact_tenant_fkey,
  validate constraint spa_followups_visit_tenant_fkey;
alter table public.crm_wa_queue
  validate constraint crm_queue_campaign_tenant_fkey,
  validate constraint crm_queue_contact_tenant_fkey,
  validate constraint crm_queue_visit_tenant_fkey,
  validate constraint crm_queue_status_valid,
  validate constraint crm_queue_delay_valid;
alter table public.spa_staff_blocks
  validate constraint spa_staff_blocks_staff_tenant_fkey,
  validate constraint spa_staff_blocks_times_valid;
alter table public.spa_staff_schedules
  validate constraint spa_staff_schedules_staff_tenant_fkey,
  validate constraint spa_staff_schedules_times_valid;
alter table public.spa_staff_services
  validate constraint spa_staff_services_company_fkey,
  validate constraint spa_staff_services_staff_tenant_fkey,
  validate constraint spa_staff_services_service_tenant_fkey;
alter table public.companies
  validate constraint companies_status_valid,
  validate constraint companies_plan_type_valid,
  validate constraint companies_subscription_dates_valid;
alter table public.crm_marketing_contacts
  validate constraint crm_contacts_phone_valid,
  validate constraint crm_contacts_totals_valid;
alter table public.crm_wa_campaigns
  validate constraint crm_campaigns_status_valid,
  validate constraint crm_campaigns_delays_valid,
  validate constraint crm_campaigns_counts_valid;
alter table public.spa_services
  validate constraint spa_services_values_valid;
alter table public.spa_products
  validate constraint spa_products_values_valid;
alter table public.wa_sessions
  validate constraint wa_sessions_status_valid,
  validate constraint wa_sessions_daily_count_valid;

comment on column public.wa_sessions.bb_project_id is
  'Deprecated BuilderBot field. Retained temporarily for compatibility.';
comment on column public.wa_sessions.bb_host is
  'Deprecated BuilderBot field. Retained temporarily for compatibility.';
comment on table public.wa_auth_state is
  'Legacy local WhatsApp auth state. No live rows; retained until provider migration completes.';
