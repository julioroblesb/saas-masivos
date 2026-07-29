begin;

-- Centro de Belleza JK is the source tenant used by /api/demo/start.
-- Keep this fixture deterministic, realistic and safe to re-run.
do $seed$
declare
  v_company_id constant uuid := '3c3cb849-06c8-4250-b4cf-9375422684a6';
  v_today constant date := (now() at time zone 'America/Lima')::date;
begin
  if not exists (
    select 1
      from public.companies
     where id = v_company_id
       and name = 'Centro de Belleza JK'
  ) then
    raise exception 'La empresa plantilla Centro de Belleza JK no existe.';
  end if;

  with source_data as (
    select
      contact.id,
      row_number() over (order by contact.id) as row_num
    from public.crm_marketing_contacts as contact
    where contact.company_id = v_company_id
  ),
  fixture as (
    select
      source_data.id,
      source_data.row_num,
      (array[
        'Valeria','Camila','Luciana','Daniela','Alejandra','Mariana','Andrea','Fernanda',
        'Gabriela','Carolina','Paola','Patricia','Mónica','Rosa','Natalia','Claudia',
        'Sofía','Renata','Jimena','Fiorella','Karla','Melissa','Vanessa','Adriana',
        'Milagros','Cynthia','Brenda','Ximena','Antonella','Lorena','Diana','Elena'
      ])[1 + ((source_data.row_num - 1) % 32)] as first_name,
      (array[
        'Mendoza','Salazar','Vargas','Rojas','Castillo','Torres','Flores','Paredes',
        'Ramírez','Gutiérrez','Chávez','Sánchez','Navarro','Cárdenas','Reyes','Espinoza',
        'Medina','Aguilar','Quispe','Valdez'
      ])[1 + (((source_data.row_num - 1) / 32) % 20)] as last_name
    from source_data
  )
  update public.crm_marketing_contacts as contact
     set name = fixture.first_name || ' ' || fixture.last_name,
         phone = '519' || lpad(fixture.row_num::text, 8, '0'),
         email = 'cliente.demo.' || lpad(fixture.row_num::text, 3, '0') || '@demo.invalid',
         document_number = (70000000 + fixture.row_num)::text,
         birthday = date '1972-01-01' + ((fixture.row_num * 137) % 12000)::integer,
         opt_in_source = (array[
           'Instagram','Recomendación','Google / Google Maps','WhatsApp',
           'Presencial / pasó por el local','Facebook','TikTok','Página web'
         ])[1 + ((fixture.row_num - 1) % 8)],
         allergies_and_conditions = (array[
           'Sin alergias conocidas.',
           'Piel sensible; evitar productos con alcohol.',
           'Alergia al látex. Usar guantes de nitrilo.',
           'Rosácea leve; evitar calor intenso y exfoliación abrasiva.',
           'Alergia a almendras y frutos secos.',
           'Dermatitis atópica controlada; confirmar productos antes del servicio.',
           'Sensibilidad a fragancias fuertes.',
           'Hipertensión controlada; evitar masajes con presión excesiva.'
         ])[1 + ((fixture.row_num - 1) % 8)],
         preferences = (array[
           'Prefiere citas por la mañana y recordatorio por WhatsApp.',
           'Prefiere atención silenciosa y música suave.',
           'Solicita productos sin fragancia.',
           'Prefiere presión media durante los masajes.',
           'Prefiere tonos cálidos y acabados naturales.',
           'Toma café sin azúcar durante servicios largos.',
           'Prefiere atenderse con la misma especialista.',
           'Solicita explicar cada paso antes de aplicar el producto.'
         ])[1 + ((fixture.row_num - 1) % 8)],
         internal_notes = (array[
           'Cliente puntual. Confirmar la cita la tarde anterior.',
           'Suele reservar para fin de mes. Ofrecer horarios con anticipación.',
           'Le interesan paquetes de mantenimiento mensual.',
           'Registrar siempre la marca y tono utilizados.',
           'Prefiere pagos por Yape o Plin.',
           'Evitar llamadas; contactar únicamente por WhatsApp.',
           'Buena candidata para programa de fidelización.',
           'Verificar evolución de sensibilidad en la próxima visita.'
         ])[1 + ((fixture.row_num - 1) % 8)],
         notes = 'Perfil ficticio generado exclusivamente para la demostración de Renova CRM.',
         tags = array[
           'demo',
           (array['frecuente','recomendación','redes-sociales','fidelización'])
             [1 + ((fixture.row_num - 1) % 4)]
         ],
         is_archived = false,
         created_at = (
           (v_today - (30 + ((fixture.row_num * 7) % 690))::integer)::timestamp
           + time '10:00'
         ) at time zone 'America/Lima',
         updated_at = now()
    from fixture
   where contact.id = fixture.id;

  -- Spread the existing 351 visits across a rolling 60-day window and leave
  -- upcoming appointments in the agenda. No real business record is involved.
  with ranked_visits as (
    select
      visit.id,
      service.price,
      row_number() over (order by visit.id) as row_num
    from public.spa_visits as visit
    join public.spa_services as service
      on service.id = visit.service_id
     and service.company_id = visit.company_id
    where visit.company_id = v_company_id
  ),
  visit_fixture as (
    select
      ranked_visits.*,
      case
        when row_num <= 330 then v_today - ((row_num - 1) % 60)::integer
        when row_num <= 338 then v_today
        else v_today + (1 + ((row_num - 339) % 6))::integer
      end as local_day,
      time '09:00' + make_interval(mins => (((row_num - 1) % 9) * 55)::integer) as local_time
    from ranked_visits
  )
  update public.spa_visits as visit
     set status = case
           when fixture.row_num <= 330 then 'completado'
           when fixture.row_num <= 338 then 'en_curso'
           else 'agendado'
         end,
         visit_date = (fixture.local_day + fixture.local_time)
           at time zone 'America/Lima',
         scheduled_date = (fixture.local_day + fixture.local_time)
           at time zone 'America/Lima',
         completed_at = case
           when fixture.row_num <= 330
             then (
               fixture.local_day
               + fixture.local_time
               + interval '50 minutes'
             ) at time zone 'America/Lima'
           else null
         end,
         price_charged = round(
           greatest(35, fixture.price * (case when fixture.row_num % 7 = 0 then 0.9 else 1 end)),
           2
         ),
         payment_status = case
           when fixture.row_num > 330 then 'pendiente'
           when fixture.row_num % 12 = 0 then 'parcial'
           when fixture.row_num % 6 = 0 then 'pendiente'
           else 'pagado'
         end,
         debt_due_date = case
           when fixture.row_num <= 330 and fixture.row_num % 6 = 0
             then (
               fixture.local_day::timestamp
               + interval '15 days'
             ) at time zone 'America/Lima'
           else null
         end,
         duration_minutes = 40 + (((fixture.row_num - 1) % 5) * 15)::integer,
         notes = (array[
           'Servicio realizado sin incidencias.',
           'Cliente solicitó el mismo acabado de su visita anterior.',
           'Se recomendó mantenimiento en tres semanas.',
           'Se registró evolución favorable desde la última atención.',
           'Cliente interesada en reservar un paquete mensual.'
         ])[1 + ((fixture.row_num - 1) % 5)],
         follow_up_date = case
           when fixture.row_num <= 330
             then (
               fixture.local_day
               + time '11:00'
               + interval '15 days'
             ) at time zone 'America/Lima'
           else null
         end,
         follow_up_sent = fixture.row_num <= 300,
         care_sent = fixture.row_num <= 315,
         created_at = (
           fixture.local_day
           + fixture.local_time
           - interval '2 days'
         ) at time zone 'America/Lima'
    from visit_fixture as fixture
   where visit.id = fixture.id;

  -- Payments are synthetic and rebuilt to match the rolling fixture exactly.
  delete from public.spa_payments
   where company_id = v_company_id;

  insert into public.spa_payments (
    company_id,
    visit_id,
    amount,
    payment_method,
    payment_date,
    notes,
    created_at,
    source,
    idempotency_key
  )
  select
    visit.company_id,
    visit.id,
    case
      when visit.payment_status = 'parcial' then round(visit.price_charged * 0.45, 2)
      else visit.price_charged
    end,
    (array['yape','efectivo','tarjeta','plin'])
      [1 + (((row_number() over (order by visit.id) - 1) % 4)::integer)],
    coalesce(visit.completed_at, visit.visit_date) + interval '5 minutes',
    case
      when visit.payment_status = 'parcial' then 'Adelanto registrado; saldo por cobrar.'
      else 'Pago completo de atención demo.'
    end,
    coalesce(visit.completed_at, visit.visit_date) + interval '5 minutes',
    'manual',
    'demo-fixture:payment:' || visit.id::text
  from public.spa_visits as visit
  where visit.company_id = v_company_id
    and visit.status = 'completado'
    and visit.payment_status in ('pagado', 'parcial');

  -- Refresh the CRM aggregates consumed by the clients screen.
  with visit_totals as (
    select
      contact.id as contact_id,
      count(visit.id) filter (where visit.status = 'completado')::integer as total_visits,
      coalesce(sum(payment.amount), 0)::numeric as total_spent,
      max(visit.completed_at) filter (where visit.status = 'completado') as last_visit_date
    from public.crm_marketing_contacts as contact
    left join public.spa_visits as visit
      on visit.contact_id = contact.id
     and visit.company_id = contact.company_id
    left join public.spa_payments as payment
      on payment.visit_id = visit.id
     and payment.company_id = visit.company_id
    where contact.company_id = v_company_id
    group by contact.id
  )
  update public.crm_marketing_contacts as contact
     set total_visits = totals.total_visits,
         total_spent = totals.total_spent,
         last_visit_date = totals.last_visit_date,
         customer_segment = case
           when totals.total_visits >= 4 and totals.total_spent >= 500 then 'VIP'
           when totals.total_visits >= 3 then 'Frecuente'
           when totals.last_visit_date >= now() - interval '30 days' then 'Nuevo'
           when totals.last_visit_date < now() - interval '60 days' then 'En Riesgo'
           else 'Ocasional'
         end,
         updated_at = now()
    from visit_totals as totals
   where contact.id = totals.contact_id;

  -- Give each specialist a complete weekly schedule and realistic blocks.
  delete from public.spa_staff_blocks
   where company_id = v_company_id;
  delete from public.spa_staff_schedules
   where company_id = v_company_id;

  insert into public.spa_staff_schedules (
    company_id,
    staff_id,
    day_of_week,
    start_time,
    end_time,
    is_working,
    created_at,
    updated_at
  )
  select
    v_company_id,
    staff.id,
    day_num,
    time '09:00',
    case when day_num = 6 then time '15:00' else time '19:00' end,
    true,
    now(),
    now()
  from public.spa_staff as staff
  cross join generate_series(1, 6) as day_num
  where staff.company_id = v_company_id;

  insert into public.spa_staff_blocks (
    company_id,
    staff_id,
    block_date,
    start_time,
    end_time,
    reason,
    created_at,
    updated_at
  )
  select
    v_company_id,
    staff.id,
    v_today + (row_number() over (order by staff.id))::integer,
    time '13:00',
    time '14:00',
    'Capacitación interna',
    now(),
    now()
  from public.spa_staff as staff
  where staff.company_id = v_company_id
  order by staff.id
  limit 2;

  -- Completed campaign history: visible in demo, never dispatched by a worker.
  insert into public.crm_wa_campaigns (
    id,
    company_id,
    name,
    message_template,
    status,
    total_contacts,
    sent_count,
    failed_count,
    replied_count,
    created_at,
    started_at,
    completed_at,
    sequence,
    min_delay_sec,
    max_delay_sec
  )
  values
    (
      'd0000000-0000-4000-8000-000000000001',
      v_company_id,
      'Recordatorio de mantenimiento',
      'Hola {{nombre}}, ya es momento de reservar tu mantenimiento. Tenemos horarios esta semana.',
      'completed',
      36, 35, 1, 9,
      (v_today - 45)::timestamp at time zone 'America/Lima',
      ((v_today - 45) + time '10:00') at time zone 'America/Lima',
      ((v_today - 45) + time '12:30') at time zone 'America/Lima',
      '[{"type":"message","content":"Recordatorio de mantenimiento"}]'::jsonb,
      45, 90
    ),
    (
      'd0000000-0000-4000-8000-000000000002',
      v_company_id,
      'Promoción de hidratación',
      'Hola {{nombre}}, esta semana tenemos una promoción especial en hidratación capilar.',
      'completed',
      48, 47, 1, 14,
      (v_today - 29)::timestamp at time zone 'America/Lima',
      ((v_today - 29) + time '11:00') at time zone 'America/Lima',
      ((v_today - 29) + time '14:40') at time zone 'America/Lima',
      '[{"type":"message","content":"Promoción de hidratación"}]'::jsonb,
      40, 80
    ),
    (
      'd0000000-0000-4000-8000-000000000003',
      v_company_id,
      'Cumpleaños del mes',
      '¡Feliz cumpleaños, {{nombre}}! Queremos celebrarlo contigo con un beneficio especial.',
      'completed',
      18, 18, 0, 7,
      (v_today - 16)::timestamp at time zone 'America/Lima',
      ((v_today - 16) + time '09:30') at time zone 'America/Lima',
      ((v_today - 16) + time '10:50') at time zone 'America/Lima',
      '[{"type":"message","content":"Beneficio de cumpleaños"}]'::jsonb,
      50, 95
    ),
    (
      'd0000000-0000-4000-8000-000000000004',
      v_company_id,
      'Horarios disponibles',
      'Hola {{nombre}}, abrimos nuevos horarios para esta semana. ¿Deseas reservar?',
      'completed',
      42, 41, 1, 12,
      (v_today - 6)::timestamp at time zone 'America/Lima',
      ((v_today - 6) + time '10:15') at time zone 'America/Lima',
      ((v_today - 6) + time '13:20') at time zone 'America/Lima',
      '[{"type":"message","content":"Nuevos horarios disponibles"}]'::jsonb,
      45, 85
    )
  on conflict (id) do update
    set name = excluded.name,
        message_template = excluded.message_template,
        status = excluded.status,
        total_contacts = excluded.total_contacts,
        sent_count = excluded.sent_count,
        failed_count = excluded.failed_count,
        replied_count = excluded.replied_count,
        created_at = excluded.created_at,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        sequence = excluded.sequence,
        min_delay_sec = excluded.min_delay_sec,
        max_delay_sec = excluded.max_delay_sec
  where public.crm_wa_campaigns.company_id = v_company_id;

  -- Sent transactional messages make dashboard recovery metrics and message
  -- history useful without placing anything in the outbound queue.
  with contact_history as (
    select
      visit.contact_id,
      min(visit.id::text)::uuid as source_visit_id,
      max(visit.completed_at) as last_completed_at,
      row_number() over (order by visit.contact_id) as row_num
    from public.spa_visits as visit
    where visit.company_id = v_company_id
      and visit.status = 'completado'
    group by visit.contact_id
    having count(*) >= 2
  )
  insert into public.crm_wa_queue (
    company_id,
    visit_id,
    contact_id,
    phone,
    message,
    status,
    sent_at,
    created_at,
    scheduled_for,
    next_attempt_at,
    replied,
    attempt_count,
    max_attempts,
    idempotency_key,
    provider_message_id,
    message_type,
    priority
  )
  select
    v_company_id,
    history.source_visit_id,
    contact.id,
    contact.phone,
    'Hola ' || split_part(contact.name, ' ', 1)
      || ', ¿cómo te fue después de tu última visita? Cuando gustes podemos reservar tu mantenimiento.',
    'sent',
    greatest(
      history.last_completed_at - interval '2 days',
      now() - make_interval(days => (1 + (history.row_num % 6))::integer)
    ),
    greatest(
      history.last_completed_at - interval '2 days',
      now() - make_interval(days => (1 + (history.row_num % 6))::integer)
    ),
    greatest(
      history.last_completed_at - interval '2 days',
      now() - make_interval(days => (1 + (history.row_num % 6))::integer)
    ),
    now(),
    history.row_num % 3 = 0,
    1,
    3,
    'demo-fixture:message:' || contact.id::text,
    'demo-fixture-' || contact.id::text,
    'transactional',
    100
  from contact_history as history
  join public.crm_marketing_contacts as contact
    on contact.id = history.contact_id
   and contact.company_id = v_company_id
  where history.row_num <= 24
  on conflict (company_id, idempotency_key) do update
    set phone = excluded.phone,
        message = excluded.message,
        status = 'sent',
        sent_at = excluded.sent_at,
        created_at = excluded.created_at,
        scheduled_for = excluded.scheduled_for,
        next_attempt_at = excluded.next_attempt_at,
        replied = excluded.replied,
        provider_message_id = excluded.provider_message_id;
end;
$seed$;

-- Dashboard metrics must use the current durable queue state machine while
-- retaining compatibility with legacy rows created before the queue hardening.
create or replace function public.rpc_get_spa_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $dashboard$
declare
  v_company_id uuid;
  v_timezone text;
  v_metrics jsonb;
  v_recent_activity jsonb;
  v_chart_data jsonb;
  v_clients_today integer;
  v_revenue_today numeric;
  v_auto_messages_7d integer;
  v_recovered_clients integer;
  v_total_clients integer;
  v_pending_messages integer;
begin
  select profile.company_id
    into v_company_id
    from public.profiles as profile
   where profile.id = auth.uid();

  if v_company_id is null then
    raise exception 'Not authorized';
  end if;

  select coalesce(company.settings->>'timezone', 'America/Lima')
    into v_timezone
    from public.companies as company
   where company.id = v_company_id;

  select count(*)
    into v_clients_today
    from public.spa_visits as visit
   where visit.company_id = v_company_id
     and visit.status not in ('cancelado', 'cancelled')
     and (
       coalesce(visit.scheduled_date, visit.visit_date) at time zone v_timezone
     )::date = (now() at time zone v_timezone)::date;

  select coalesce(sum(payment.amount), 0)
    into v_revenue_today
    from public.spa_payments as payment
   where payment.company_id = v_company_id
     and (payment.payment_date at time zone v_timezone)::date
       = (now() at time zone v_timezone)::date;

  select count(*)
    into v_auto_messages_7d
    from public.crm_wa_queue as queue
   where queue.company_id = v_company_id
     and queue.visit_id is not null
     and queue.status in ('sent', 'enviado')
     and queue.sent_at >= now() - interval '7 days';

  select count(distinct later_visit.contact_id)
    into v_recovered_clients
    from public.crm_wa_queue as queue
    join public.spa_visits as later_visit
      on later_visit.contact_id = queue.contact_id
     and later_visit.company_id = queue.company_id
     and later_visit.visit_date > queue.sent_at
   where queue.company_id = v_company_id
     and queue.visit_id is not null
     and queue.status in ('sent', 'enviado')
     and later_visit.status = 'completado';

  select count(*)
    into v_total_clients
    from public.crm_marketing_contacts as contact
   where contact.company_id = v_company_id
     and coalesce(contact.is_archived, false) = false;

  select count(*)
    into v_pending_messages
    from public.crm_wa_queue as queue
   where queue.company_id = v_company_id
     and queue.status in ('queued', 'retry_scheduled', 'pendiente');

  v_metrics := jsonb_build_object(
    'clients_today', v_clients_today,
    'revenue_today', v_revenue_today,
    'auto_messages_7d', v_auto_messages_7d,
    'recovered_clients', v_recovered_clients,
    'total_clients', v_total_clients,
    'pending_messages', v_pending_messages
  );

  select coalesce(jsonb_agg(activity), '[]'::jsonb)
    into v_recent_activity
    from (
      select
        visit.id,
        contact.name as contact_name,
        contact.phone as contact_phone,
        service.name as service_name,
        visit.price_charged,
        visit.status,
        coalesce(visit.scheduled_date, visit.visit_date) as visit_date,
        visit.payment_status,
        (
          select coalesce(sum(payment.amount), 0)
            from public.spa_payments as payment
           where payment.visit_id = visit.id
             and payment.company_id = visit.company_id
        ) as amount_paid
      from public.spa_visits as visit
      join public.crm_marketing_contacts as contact
        on contact.id = visit.contact_id
       and contact.company_id = visit.company_id
      join public.spa_services as service
        on service.id = visit.service_id
       and service.company_id = visit.company_id
      where visit.company_id = v_company_id
      order by coalesce(visit.scheduled_date, visit.visit_date) desc, visit.created_at desc
      limit 5
    ) as activity;

  select coalesce(jsonb_agg(chart_day), '[]'::jsonb)
    into v_chart_data
    from (
      select
        days.date_value::text as date,
        coalesce((
          select sum(payment.amount)
            from public.spa_payments as payment
           where payment.company_id = v_company_id
             and (payment.payment_date at time zone v_timezone)::date = days.date_value
        ), 0) as revenue,
        coalesce((
          select count(visit.id)
            from public.spa_visits as visit
           where visit.company_id = v_company_id
             and visit.status not in ('cancelado', 'cancelled')
             and (
               coalesce(visit.scheduled_date, visit.visit_date) at time zone v_timezone
             )::date = days.date_value
        ), 0) as visits
      from (
        select (
          (now() at time zone v_timezone)::date - series.offset_value
        )::date as date_value
          from generate_series(0, 6) as series(offset_value)
      ) as days
      order by days.date_value
    ) as chart_day;

  return jsonb_build_object(
    'metrics', v_metrics,
    'recent_activity', v_recent_activity,
    'chart_data', v_chart_data
  );
end;
$dashboard$;

revoke all on function public.rpc_get_spa_dashboard()
  from public, anon;
grant execute on function public.rpc_get_spa_dashboard()
  to authenticated;

-- Clone every meaningful business field and shift operational timestamps so
-- each new demo feels active on the day it is created.
create or replace function public.rpc_clone_demo_company(p_template_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_new_company_id uuid;
  v_template_company public.companies%rowtype;
  v_template_wa_session public.wa_sessions%rowtype;
  v_date_shift interval := interval '0 days';
  v_old_service_id uuid;
  v_new_service_id uuid;
  v_old_staff_id uuid;
  v_new_staff_id uuid;
  v_old_contact_id uuid;
  v_new_contact_id uuid;
  v_old_visit_id uuid;
  v_new_visit_id uuid;
  v_old_campaign_id uuid;
  v_new_campaign_id uuid;
begin
  select *
    into v_template_company
    from public.companies
   where id = p_template_company_id
   limit 1;

  if not found then
    raise exception 'Empresa plantilla no encontrada';
  end if;

  select coalesce(
           date_trunc('day', now())
             - date_trunc('day', max(coalesce(completed_at, visit_date))),
           interval '0 days'
         )
    into v_date_shift
    from public.spa_visits
   where company_id = p_template_company_id
     and status = 'completado';

  insert into public.companies (
    name,
    status,
    is_demo,
    settings,
    plan_type,
    subscription_start_at,
    subscription_end_at
  )
  values (
    v_template_company.name || ' (Invitado)',
    'activa',
    true,
    v_template_company.settings,
    'demo',
    now(),
    now() + interval '2 days'
  )
  returning id into v_new_company_id;

  select *
    into v_template_wa_session
    from public.wa_sessions
   where company_id = p_template_company_id
   limit 1;

  if found then
    insert into public.wa_sessions (
      company_id,
      status,
      phone_number,
      bb_project_id,
      bb_host,
      next_allowed_send_at,
      last_connected_at
    )
    values (
      v_new_company_id,
      v_template_wa_session.status,
      v_template_wa_session.phone_number,
      v_template_wa_session.bb_project_id,
      v_template_wa_session.bb_host,
      now(),
      now()
    );
  end if;

  insert into public.spa_products (
    company_id,
    name,
    description,
    price,
    stock,
    is_active,
    image_url,
    created_at,
    updated_at
  )
  select
    v_new_company_id,
    name,
    description,
    price,
    stock,
    is_active,
    image_url,
    created_at,
    updated_at
  from public.spa_products
  where company_id = p_template_company_id;

  create temporary table tmp_service_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_service_id in
    select id
      from public.spa_services
     where company_id = p_template_company_id
  loop
    insert into public.spa_services (
      company_id,
      name,
      description,
      price,
      min_price,
      promo_price,
      duration_days,
      care_instructions,
      care_image_url,
      is_active,
      created_at,
      updated_at
    )
    select
      v_new_company_id,
      name,
      description,
      price,
      min_price,
      promo_price,
      duration_days,
      care_instructions,
      care_image_url,
      is_active,
      created_at,
      updated_at
    from public.spa_services
    where id = v_old_service_id
    returning id into v_new_service_id;

    insert into tmp_service_map (old_id, new_id)
    values (v_old_service_id, v_new_service_id);
  end loop;

  create temporary table tmp_staff_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_staff_id in
    select id
      from public.spa_staff
     where company_id = p_template_company_id
  loop
    insert into public.spa_staff (
      company_id,
      name,
      birthday,
      role,
      is_active,
      created_at,
      updated_at
    )
    select
      v_new_company_id,
      name,
      birthday,
      role,
      is_active,
      created_at,
      updated_at
    from public.spa_staff
    where id = v_old_staff_id
    returning id into v_new_staff_id;

    insert into tmp_staff_map (old_id, new_id)
    values (v_old_staff_id, v_new_staff_id);
  end loop;

  insert into public.spa_staff_services (staff_id, service_id, company_id)
  select staff_map.new_id, service_map.new_id, v_new_company_id
    from public.spa_staff_services as old_link
    join tmp_staff_map as staff_map on staff_map.old_id = old_link.staff_id
    join tmp_service_map as service_map on service_map.old_id = old_link.service_id
   where old_link.company_id = p_template_company_id;

  insert into public.spa_staff_schedules (
    company_id,
    staff_id,
    day_of_week,
    start_time,
    end_time,
    is_working,
    created_at,
    updated_at
  )
  select
    v_new_company_id,
    staff_map.new_id,
    schedule.day_of_week,
    schedule.start_time,
    schedule.end_time,
    schedule.is_working,
    schedule.created_at,
    schedule.updated_at
  from public.spa_staff_schedules as schedule
  join tmp_staff_map as staff_map on staff_map.old_id = schedule.staff_id
  where schedule.company_id = p_template_company_id;

  insert into public.spa_staff_blocks (
    company_id,
    staff_id,
    block_date,
    start_time,
    end_time,
    reason,
    created_at,
    updated_at
  )
  select
    v_new_company_id,
    staff_map.new_id,
    schedule.block_date + (extract(day from v_date_shift))::integer,
    schedule.start_time,
    schedule.end_time,
    schedule.reason,
    schedule.created_at + v_date_shift,
    schedule.updated_at + v_date_shift
  from public.spa_staff_blocks as schedule
  join tmp_staff_map as staff_map on staff_map.old_id = schedule.staff_id
  where schedule.company_id = p_template_company_id;

  create temporary table tmp_contact_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_contact_id in
    select id
      from public.crm_marketing_contacts
     where company_id = p_template_company_id
  loop
    insert into public.crm_marketing_contacts (
      company_id,
      phone,
      name,
      tags,
      email,
      document_number,
      birthday,
      opt_in_source,
      notes,
      allergies_and_conditions,
      preferences,
      internal_notes,
      total_spent,
      total_visits,
      last_visit_date,
      customer_segment,
      is_archived,
      created_at,
      updated_at
    )
    select
      v_new_company_id,
      phone,
      name,
      tags,
      email,
      document_number,
      birthday,
      opt_in_source,
      notes,
      allergies_and_conditions,
      preferences,
      internal_notes,
      total_spent,
      total_visits,
      last_visit_date + v_date_shift,
      customer_segment,
      is_archived,
      created_at,
      updated_at
    from public.crm_marketing_contacts
    where id = v_old_contact_id
    returning id into v_new_contact_id;

    insert into tmp_contact_map (old_id, new_id)
    values (v_old_contact_id, v_new_contact_id);
  end loop;

  create temporary table tmp_campaign_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_campaign_id in
    select id
      from public.crm_wa_campaigns
     where company_id = p_template_company_id
  loop
    insert into public.crm_wa_campaigns (
      company_id,
      name,
      message_template,
      status,
      total_contacts,
      sent_count,
      failed_count,
      replied_count,
      created_at,
      started_at,
      completed_at,
      sequence,
      min_delay_sec,
      max_delay_sec
    )
    select
      v_new_company_id,
      name,
      message_template,
      status,
      total_contacts,
      sent_count,
      failed_count,
      replied_count,
      created_at + v_date_shift,
      started_at + v_date_shift,
      completed_at + v_date_shift,
      sequence,
      min_delay_sec,
      max_delay_sec
    from public.crm_wa_campaigns
    where id = v_old_campaign_id
    returning id into v_new_campaign_id;

    insert into tmp_campaign_map (old_id, new_id)
    values (v_old_campaign_id, v_new_campaign_id);
  end loop;

  create temporary table tmp_visit_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_old_visit_id in
    select id
      from public.spa_visits
     where company_id = p_template_company_id
  loop
    insert into public.spa_visits (
      company_id,
      contact_id,
      staff_id,
      service_id,
      status,
      visit_date,
      scheduled_date,
      price_charged,
      payment_status,
      completed_at,
      notes,
      follow_up_date,
      follow_up_sent,
      care_sent,
      debt_due_date,
      duration_minutes,
      created_at
    )
    select
      v_new_company_id,
      contact_map.new_id,
      staff_map.new_id,
      service_map.new_id,
      visit.status,
      visit.visit_date + v_date_shift,
      visit.scheduled_date + v_date_shift,
      visit.price_charged,
      visit.payment_status,
      visit.completed_at + v_date_shift,
      visit.notes,
      visit.follow_up_date + v_date_shift,
      visit.follow_up_sent,
      visit.care_sent,
      visit.debt_due_date + v_date_shift,
      visit.duration_minutes,
      visit.created_at + v_date_shift
    from public.spa_visits as visit
    join tmp_contact_map as contact_map on contact_map.old_id = visit.contact_id
    join tmp_service_map as service_map on service_map.old_id = visit.service_id
    left join tmp_staff_map as staff_map on staff_map.old_id = visit.staff_id
    where visit.id = v_old_visit_id
    returning id into v_new_visit_id;

    insert into tmp_visit_map (old_id, new_id)
    values (v_old_visit_id, v_new_visit_id);
  end loop;

  insert into public.spa_payments (
    company_id,
    visit_id,
    amount,
    payment_method,
    payment_date,
    notes,
    created_at,
    source,
    idempotency_key
  )
  select
    v_new_company_id,
    visit_map.new_id,
    payment.amount,
    payment.payment_method,
    payment.payment_date + v_date_shift,
    payment.notes,
    payment.created_at + v_date_shift,
    payment.source,
    'demo-clone:' || v_new_company_id::text || ':payment:' || payment.id::text
  from public.spa_payments as payment
  join tmp_visit_map as visit_map on visit_map.old_id = payment.visit_id
  where payment.company_id = p_template_company_id;

  insert into public.crm_wa_queue (
    company_id,
    campaign_id,
    contact_id,
    visit_id,
    phone,
    message,
    status,
    error_message,
    sent_at,
    created_at,
    scheduled_for,
    replied,
    delay_after_ms,
    media_url,
    attempt_count,
    max_attempts,
    next_attempt_at,
    idempotency_key,
    provider_message_id,
    last_error_code,
    last_error_at,
    priority,
    message_type
  )
  select
    v_new_company_id,
    campaign_map.new_id,
    contact_map.new_id,
    visit_map.new_id,
    queue.phone,
    queue.message,
    'sent',
    queue.error_message,
    queue.sent_at + v_date_shift,
    queue.created_at + v_date_shift,
    queue.scheduled_for + v_date_shift,
    queue.replied,
    queue.delay_after_ms,
    queue.media_url,
    queue.attempt_count,
    queue.max_attempts,
    coalesce(queue.next_attempt_at + v_date_shift, now()),
    'demo-clone:' || v_new_company_id::text || ':message:' || queue.id::text,
    'demo-clone-' || queue.id::text,
    queue.last_error_code,
    queue.last_error_at + v_date_shift,
    queue.priority,
    queue.message_type
  from public.crm_wa_queue as queue
  left join tmp_campaign_map as campaign_map on campaign_map.old_id = queue.campaign_id
  left join tmp_contact_map as contact_map on contact_map.old_id = queue.contact_id
  left join tmp_visit_map as visit_map on visit_map.old_id = queue.visit_id
  where queue.company_id = p_template_company_id
    and queue.idempotency_key like 'demo-fixture:message:%'
    and queue.status = 'sent';

  return jsonb_build_object(
    'success', true,
    'new_company_id', v_new_company_id,
    'date_shift_days', extract(day from v_date_shift)
  );
end;
$function$;

revoke all on function public.rpc_clone_demo_company(uuid)
  from public, anon, authenticated;
grant execute on function public.rpc_clone_demo_company(uuid)
  to service_role;

commit;
