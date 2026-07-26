-- Deterministic, non-sensitive fixtures for the local Supabase stack only.
insert into public.companies (
  id,
  name,
  status,
  plan_type,
  settings,
  is_demo,
  subscription_start_at,
  subscription_end_at
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Salon Demo Local',
    'activa',
    'prueba',
    '{"timezone":"America/Lima","currency":"PEN"}'::jsonb,
    true,
    now(),
    now() + interval '30 days'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Tenant B Local',
    'activa',
    'prueba',
    '{"timezone":"America/Lima","currency":"PEN"}'::jsonb,
    true,
    now(),
    now() + interval '30 days'
  )
on conflict (id) do nothing;

-- Stable identities for local RLS, role and E2E tests. The password is
-- intentionally public and local-only: LocalTest123!
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'owner-a@local.test',
    crypt('LocalTest123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'employee-a@local.test',
    crypt('LocalTest123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'owner-b@local.test',
    crypt('LocalTest123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'superadmin@local.test',
    crypt('LocalTest123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000001',
    'owner-a@local.test',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"owner-a@local.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    'employee-a@local.test',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"employee-a@local.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11000000-0000-4000-8000-000000000003',
    'owner-b@local.test',
    '10000000-0000-4000-8000-000000000003',
    '{"sub":"10000000-0000-4000-8000-000000000003","email":"owner-b@local.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11000000-0000-4000-8000-000000000004',
    'superadmin@local.test',
    '10000000-0000-4000-8000-000000000004',
    '{"sub":"10000000-0000-4000-8000-000000000004","email":"superadmin@local.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, company_id, role, full_name)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'owner',
    'Owner A'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'employee',
    'Employee A'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000002',
    'owner',
    'Owner B'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    null,
    'super_admin',
    'Superadmin Local'
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
values
  (
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    '51999999999',
    'Cliente Demo',
    array['demo'],
    'seed_local'
  ),
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000002',
    '51888888888',
    'Cliente Tenant B',
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
values
  (
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000001',
    'Servicio Demo',
    'Servicio generado unicamente para desarrollo local.',
    100,
    1,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000002',
    'Servicio Tenant B',
    'Servicio para verificar aislamiento local.',
    120,
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

insert into public.spa_staff_services (staff_id, service_id, company_id)
values (
  '00000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000001'
)
on conflict do nothing;
