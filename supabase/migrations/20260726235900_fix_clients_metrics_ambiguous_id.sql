create or replace function public.rpc_get_clients_metrics()
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
  created_at timestamptz,
  campaigns_count bigint,
  last_message_sent_at timestamptz,
  last_reply_at timestamptz,
  total_visits bigint,
  total_spent numeric,
  customer_segment text,
  last_visit_at timestamptz,
  last_service_name text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
begin
  select p.company_id
    into v_company_id
    from public.profiles as p
   where p.id = auth.uid();

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
        from public.spa_visits as sv
        join public.spa_services as ss
          on ss.id = sv.service_id
         and ss.company_id = sv.company_id
       where sv.contact_id = c.id
         and sv.company_id = c.company_id
       order by sv.visit_date desc
       limit 1
    )::text
  from public.crm_marketing_contacts as c
  left join public.crm_wa_queue as q
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

notify pgrst, 'reload schema';
