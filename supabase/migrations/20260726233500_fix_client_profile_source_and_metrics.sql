begin;

-- ============================================================
-- 1. GUARDAR Y ACTUALIZAR CORRECTAMENTE EL CANAL DE ORIGEN
-- ============================================================

create or replace function public.rpc_upsert_marketing_contact(
  p_phone text,
  p_name text,
  p_tags text[],
  p_opt_in_source text default null,
  p_email text default null,
  p_birthday date default null,
  p_allergies_and_conditions text default null,
  p_preferences text default null,
  p_internal_notes text default null,
  p_document_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_company_id uuid;
  v_contact_id uuid;
begin
  select company_id
  into v_company_id
  from public.profiles
  where id = auth.uid();

  if v_company_id is null then
    raise exception 'Not authorized';
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
    document_number
  )
  values (
    v_company_id,
    p_phone,
    p_name,
    coalesce(p_tags, '{}'::text[]),
    nullif(btrim(p_opt_in_source), ''),
    p_email,
    p_birthday,
    p_allergies_and_conditions,
    p_preferences,
    p_internal_notes,
    p_document_number
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
    updated_at = now()
  returning id into v_contact_id;

  return jsonb_build_object('id', v_contact_id);
end;
$function$;


-- ============================================================
-- 2. DEVOLVER DNI Y CANAL DE ORIGEN EN LA SECCIÓN CLIENTES
-- ============================================================

drop function if exists public.rpc_get_clients_metrics();

create function public.rpc_get_clients_metrics()
returns table(
  id uuid,
  phone text,
  name text,
  email text,
  document_number text,
  birthday text,
  opt_in_source text,
  allergies_and_conditions text,
  preferences text,
  internal_notes text,
  is_archived boolean,
  created_at timestamp with time zone,
  campaigns_count bigint,
  last_message_sent_at timestamp with time zone,
  last_reply_at timestamp with time zone,
  total_visits bigint,
  total_spent numeric,
  customer_segment text,
  last_visit_at timestamp with time zone,
  last_service_name text
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_company_id uuid;
begin
  select company_id
  into v_company_id
  from public.profiles
  where id = auth.uid();

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  return query
  select
    c.id,
    c.phone::text,
    c.name::text,
    c.email::text,
    c.document_number::text,
    c.birthday::text,
    c.opt_in_source::text,
    c.allergies_and_conditions::text,
    c.preferences::text,
    c.internal_notes::text,
    coalesce(c.is_archived, false),
    c.created_at,
    count(
      distinct case
        when q.status = 'enviado' then q.campaign_id
        else null
      end
    )::bigint,
    max(
      case
        when q.status = 'enviado'
          then coalesce(q.sent_at, q.created_at)
        else null
      end
    ),
    max(
      case
        when q.replied = true
          then coalesce(q.sent_at, q.created_at)
        else null
      end
    ),
    coalesce(c.total_visits, 0)::bigint,
    coalesce(c.total_spent, 0)::numeric,
    c.customer_segment::text,
    c.last_visit_date,
    (
      select ss.name
      from public.spa_visits sv
      join public.spa_services ss
        on ss.id = sv.service_id
       and ss.company_id = sv.company_id
      where sv.contact_id = c.id
        and sv.company_id = c.company_id
      order by sv.visit_date desc
      limit 1
    )::text
  from public.crm_marketing_contacts c
  left join public.crm_wa_queue q
    on q.company_id = c.company_id
   and (
     q.contact_id = c.id
     or q.phone = c.phone
   )
  where c.company_id = v_company_id
  group by c.id
  order by c.created_at desc;
end;
$function$;

revoke all
on function public.rpc_upsert_marketing_contact(
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
)
from public, anon;

grant execute
on function public.rpc_upsert_marketing_contact(
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
)
to authenticated, service_role;

revoke all
on function public.rpc_get_clients_metrics()
from public, anon;

grant execute
on function public.rpc_get_clients_metrics()
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
