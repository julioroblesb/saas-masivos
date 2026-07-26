-- Deterministic, non-sensitive data for local development only.
insert into public.companies (
  id,
  name,
  status,
  plan_type,
  settings,
  is_demo
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Salón Demo Local',
  'activa',
  'prueba',
  '{"timezone":"America/Lima","currency":"PEN"}'::jsonb,
  true
)
on conflict (id) do nothing;

insert into public.crm_marketing_contacts (
  id,
  company_id,
  phone,
  name,
  tags,
  opt_in_source
)
values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '51999999999',
  'Cliente Demo',
  array['demo'],
  'seed_local'
)
on conflict (id) do nothing;

insert into public.spa_services (
  id,
  company_id,
  name,
  description,
  price,
  duration_days,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000001',
  'Servicio Demo',
  'Servicio generado únicamente para desarrollo local.',
  100,
  1,
  true
)
on conflict (id) do nothing;

insert into public.spa_staff (
  id,
  company_id,
  name,
  role,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000001',
  'Profesional Demo',
  'especialista',
  true
)
on conflict (id) do nothing;

insert into public.spa_staff_services (staff_id, service_id)
values (
  '00000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000020'
)
on conflict do nothing;
