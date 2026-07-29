-- Keep high-traffic visit views tenant-scoped and index-backed.
-- Partial indexes stay compact because each screen reads a disjoint status set.
create index if not exists spa_visits_tenant_history_idx
  on public.spa_visits (company_id, visit_date desc, id desc)
  where status in ('completado', 'cancelado', 'no_asistio');

create index if not exists spa_visits_tenant_operational_idx
  on public.spa_visits (company_id, visit_date desc, id desc)
  where status in ('agendado', 'en_curso');

create index if not exists spa_visits_tenant_open_balance_idx
  on public.spa_visits (company_id, debt_due_date, visit_date desc, id desc)
  where status = 'completado'
    and payment_status in ('pendiente', 'parcial');
