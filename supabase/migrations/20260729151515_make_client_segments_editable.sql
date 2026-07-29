begin;

alter table public.crm_marketing_contacts
  add column if not exists customer_segment_manual boolean not null default false;

drop function if exists public.rpc_upsert_marketing_contact(
  text,
  text,
  text[],
  text,
  text,
  date,
  text,
  text,
  text,
  text
);

create function public.rpc_upsert_marketing_contact(
  p_phone text,
  p_name text,
  p_tags text[],
  p_opt_in_source text default null,
  p_email text default null,
  p_birthday date default null,
  p_allergies_and_conditions text default null,
  p_preferences text default null,
  p_internal_notes text default null,
  p_document_number text default null,
  p_customer_segment text default null,
  p_customer_segment_manual boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
  v_contact_id uuid;
begin
  select profile.company_id
    into v_company_id
    from public.profiles as profile
   where profile.id = auth.uid();

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  if p_customer_segment is not null
    and p_customer_segment not in (
      'VIP',
      'Frecuente',
      'Nuevo',
      'En Riesgo',
      'Perdido',
      'Ocasional'
    )
  then
    raise exception 'Invalid customer segment';
  end if;

  insert into public.crm_marketing_contacts (
    company_id,
    phone,
    name,
    tags,
    opt_in_source,
    email,
    birthday,
    allergies_and_conditions,
    preferences,
    internal_notes,
    document_number,
    customer_segment,
    customer_segment_manual
  )
  values (
    v_company_id,
    p_phone,
    p_name,
    coalesce(p_tags, '{}'::text[]),
    nullif(btrim(p_opt_in_source), ''),
    nullif(btrim(p_email), ''),
    p_birthday,
    nullif(btrim(p_allergies_and_conditions), ''),
    nullif(btrim(p_preferences), ''),
    nullif(btrim(p_internal_notes), ''),
    nullif(btrim(p_document_number), ''),
    coalesce(p_customer_segment, 'Nuevo'),
    coalesce(p_customer_segment_manual, false)
  )
  on conflict (company_id, phone)
  do update set
    name = coalesce(excluded.name, crm_marketing_contacts.name),
    tags = (
      select coalesce(array_agg(distinct merged.tag), '{}'::text[])
      from unnest(
        coalesce(crm_marketing_contacts.tags, '{}'::text[])
        ||
        coalesce(excluded.tags, '{}'::text[])
      ) as merged(tag)
    ),
    opt_in_source = coalesce(
      excluded.opt_in_source,
      crm_marketing_contacts.opt_in_source
    ),
    email = coalesce(excluded.email, crm_marketing_contacts.email),
    birthday = coalesce(excluded.birthday, crm_marketing_contacts.birthday),
    allergies_and_conditions = coalesce(
      excluded.allergies_and_conditions,
      crm_marketing_contacts.allergies_and_conditions
    ),
    preferences = coalesce(
      excluded.preferences,
      crm_marketing_contacts.preferences
    ),
    internal_notes = coalesce(
      excluded.internal_notes,
      crm_marketing_contacts.internal_notes
    ),
    document_number = coalesce(
      excluded.document_number,
      crm_marketing_contacts.document_number
    ),
    customer_segment = case
      when p_customer_segment is null
        then crm_marketing_contacts.customer_segment
      else p_customer_segment
    end,
    customer_segment_manual = case
      when p_customer_segment is null
        then crm_marketing_contacts.customer_segment_manual
      else coalesce(p_customer_segment_manual, false)
    end,
    updated_at = now()
  returning id into v_contact_id;

  return jsonb_build_object('id', v_contact_id);
end;
$function$;

create or replace function public.rpc_recalculate_customer_segment(p_contact_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
  v_contact record;
  v_days_since_created integer;
  v_days_since_last_visit integer;
  v_months_active numeric;
  v_visits_per_month numeric;
  v_new_segment text;
begin
  select profile.company_id
    into v_company_id
    from public.profiles as profile
   where profile.id = auth.uid();

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  select
    contact.created_at,
    contact.last_visit_date,
    contact.total_visits,
    contact.customer_segment,
    contact.customer_segment_manual
    into v_contact
    from public.crm_marketing_contacts as contact
   where contact.id = p_contact_id
     and contact.company_id = v_company_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  if v_contact.customer_segment_manual then
    return v_contact.customer_segment;
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

  update public.crm_marketing_contacts as contact
     set customer_segment = v_new_segment
   where contact.id = p_contact_id
     and contact.company_id = v_company_id
     and contact.customer_segment_manual = false
     and contact.customer_segment is distinct from v_new_segment;

  return v_new_segment;
end;
$function$;

revoke all on function public.rpc_upsert_marketing_contact(
  text,
  text,
  text[],
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  boolean
) from public, anon;
grant execute on function public.rpc_upsert_marketing_contact(
  text,
  text,
  text[],
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  boolean
) to authenticated, service_role;

revoke all on function public.rpc_recalculate_customer_segment(uuid)
  from public, anon;
grant execute on function public.rpc_recalculate_customer_segment(uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
