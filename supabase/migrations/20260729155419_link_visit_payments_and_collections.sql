-- Make every payment an auditable business movement. A visit completion and a
-- payment are intentionally separate events: completing a service never implies
-- that its balance was collected.

alter table public.spa_payments
  add column if not exists operation_reference text;

update public.spa_payments
   set payment_date = coalesce(payment_date, created_at, now())
 where payment_date is null;

alter table public.spa_payments
  alter column payment_date set default now(),
  alter column payment_date set not null;

-- Existing electronic demo/import payments predate operation references. Give
-- them stable, clearly synthetic references so historical rows remain auditable.
update public.spa_payments
   set operation_reference = lpad(
     (('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint % 10000000000)::text,
     10,
     '0'
   )
 where lower(payment_method) <> 'efectivo'
   and nullif(btrim(operation_reference), '') is null;

alter table public.spa_payments
  drop constraint if exists spa_payments_method_valid,
  drop constraint if exists spa_payments_reference_required;

alter table public.spa_payments
  add constraint spa_payments_method_valid
    check (lower(payment_method) in ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta'))
    not valid,
  add constraint spa_payments_reference_required
    check (
      lower(payment_method) = 'efectivo'
      or char_length(btrim(operation_reference)) between 3 and 120
    )
    not valid;

alter table public.spa_payments
  validate constraint spa_payments_method_valid,
  validate constraint spa_payments_reference_required;

create index if not exists spa_payments_company_visit_date_idx
  on public.spa_payments (company_id, visit_id, payment_date desc);

-- Keep payment_status derived from the actual ledger even when a payment is
-- imported, corrected or removed outside the normal RPC.
create or replace function public.trg_sync_visit_payment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visit_id uuid := coalesce(new.visit_id, old.visit_id);
  v_company_id uuid := coalesce(new.company_id, old.company_id);
  v_price numeric;
  v_total_paid numeric;
  v_payment_status text;
begin
  select price_charged
    into v_price
    from public.spa_visits
   where id = v_visit_id
     and company_id = v_company_id;

  if found then
    select coalesce(sum(amount), 0)
      into v_total_paid
      from public.spa_payments
     where visit_id = v_visit_id
       and company_id = v_company_id;

    v_payment_status := case
      when v_total_paid >= coalesce(v_price, 0) then 'pagado'
      when v_total_paid > 0 then 'parcial'
      else 'pendiente'
    end;

    update public.spa_visits
       set payment_status = v_payment_status,
           debt_due_date = case
             when v_payment_status = 'pagado' then null
             else debt_due_date
           end
     where id = v_visit_id
       and company_id = v_company_id;
  end if;

  if tg_op = 'UPDATE'
     and (old.visit_id, old.company_id) is distinct from (new.visit_id, new.company_id) then
    select price_charged
      into v_price
      from public.spa_visits
     where id = old.visit_id
       and company_id = old.company_id;

    if found then
      select coalesce(sum(amount), 0)
        into v_total_paid
        from public.spa_payments
       where visit_id = old.visit_id
         and company_id = old.company_id;

      v_payment_status := case
        when v_total_paid >= coalesce(v_price, 0) then 'pagado'
        when v_total_paid > 0 then 'parcial'
        else 'pendiente'
      end;

      update public.spa_visits
         set payment_status = v_payment_status,
             debt_due_date = case
               when v_payment_status = 'pagado' then null
               else debt_due_date
             end
       where id = old.visit_id
         and company_id = old.company_id;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists spa_payments_sync_visit_status on public.spa_payments;
create trigger spa_payments_sync_visit_status
after insert or update or delete on public.spa_payments
for each row execute function public.trg_sync_visit_payment_status();

-- Repair legacy status values from the ledger before the new trigger takes over.
with totals as (
  select
    visit.id,
    visit.company_id,
    visit.price_charged,
    coalesce(sum(payment.amount), 0) as total_paid
  from public.spa_visits as visit
  left join public.spa_payments as payment
    on payment.visit_id = visit.id
   and payment.company_id = visit.company_id
  group by visit.id, visit.company_id, visit.price_charged
)
update public.spa_visits as visit
   set payment_status = case
         when totals.total_paid >= coalesce(totals.price_charged, 0) then 'pagado'
         when totals.total_paid > 0 then 'parcial'
         else 'pendiente'
       end,
       debt_due_date = case
         when totals.total_paid >= coalesce(totals.price_charged, 0) then null
         else visit.debt_due_date
       end
  from totals
 where visit.id = totals.id
   and visit.company_id = totals.company_id;

drop function if exists public.rpc_add_visit_payment(uuid, numeric, text, text);

create function public.rpc_add_visit_payment(
  p_visit_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_idempotency_key text,
  p_payment_date timestamptz default now(),
  p_operation_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_company_id uuid;
  v_price numeric;
  v_total_paid numeric;
  v_payment_status text;
  v_payment_method text := lower(btrim(p_payment_method));
  v_payment_date timestamptz := coalesce(p_payment_date, now());
  v_operation_reference text := nullif(btrim(p_operation_reference), '');
  v_payment_id uuid;
  v_inserted boolean := false;
begin
  if v_actor_id is null then raise exception 'Not authenticated'; end if;
  if p_amount <= 0 then raise exception 'El pago debe ser mayor que cero'; end if;
  if v_payment_method not in ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta') then
    raise exception 'Método de pago no válido';
  end if;
  if v_payment_method <> 'efectivo'
     and (v_operation_reference is null or char_length(v_operation_reference) not between 3 and 120) then
    raise exception 'El número de operación es obligatorio';
  end if;
  if v_payment_date > now() + interval '5 minutes' then
    raise exception 'La fecha del pago no puede estar en el futuro';
  end if;
  if char_length(btrim(p_idempotency_key)) not between 1 and 200 then
    raise exception 'Clave de idempotencia inválida';
  end if;
  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'La nota del pago es demasiado extensa';
  end if;

  select company_id
    into v_company_id
    from public.profiles
   where id = v_actor_id;
  if v_company_id is null then raise exception 'Not authorized'; end if;

  select price_charged
    into v_price
    from public.spa_visits
   where id = p_visit_id
     and company_id = v_company_id
   for update;
  if not found then raise exception 'Atención no encontrada'; end if;

  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.spa_payments
   where visit_id = p_visit_id
     and company_id = v_company_id;

  if v_total_paid + p_amount > coalesce(v_price, 0) then
    raise exception 'El pago excede el saldo pendiente';
  end if;

  insert into public.spa_payments (
    company_id,
    visit_id,
    amount,
    payment_method,
    payment_date,
    operation_reference,
    notes,
    source,
    idempotency_key
  )
  values (
    v_company_id,
    p_visit_id,
    p_amount,
    v_payment_method,
    v_payment_date,
    case when v_payment_method = 'efectivo' then null else v_operation_reference end,
    nullif(btrim(p_notes), ''),
    'manual',
    btrim(p_idempotency_key)
  )
  on conflict (company_id, idempotency_key)
    where idempotency_key is not null
  do nothing
  returning id into v_payment_id;

  if v_payment_id is not null then
    v_inserted := true;
  else
    select id
      into v_payment_id
      from public.spa_payments
     where company_id = v_company_id
       and idempotency_key = btrim(p_idempotency_key);
  end if;

  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.spa_payments
   where visit_id = p_visit_id
     and company_id = v_company_id;

  v_payment_status := case
    when v_total_paid >= coalesce(v_price, 0) then 'pagado'
    when v_total_paid > 0 then 'parcial'
    else 'pendiente'
  end;

  return jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'visit_id', p_visit_id,
    'payment_status', v_payment_status,
    'total_paid', v_total_paid,
    'payment', (
      select jsonb_build_object(
        'id', payment.id,
        'amount', payment.amount,
        'payment_method', payment.payment_method,
        'payment_date', payment.payment_date,
        'operation_reference', payment.operation_reference,
        'notes', payment.notes
      )
      from public.spa_payments as payment
      where payment.id = v_payment_id
    )
  );
end;
$$;

create or replace function public.rpc_complete_visit_with_payment(
  p_visit_id uuid,
  p_initial_payment numeric default 0,
  p_payment_method text default null,
  p_payment_date timestamptz default now(),
  p_operation_reference text default null,
  p_idempotency_key text default null,
  p_is_credit boolean default false,
  p_debt_due_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completion jsonb;
  v_payment jsonb;
begin
  if p_initial_payment < 0 then
    raise exception 'El pago no puede ser negativo';
  end if;
  if p_initial_payment > 0 and nullif(btrim(p_idempotency_key), '') is null then
    raise exception 'Clave de idempotencia inválida';
  end if;

  v_completion := public.rpc_complete_visit(
    p_visit_id => p_visit_id,
    p_payment_method => null,
    p_is_credit => p_is_credit,
    p_initial_payment => 0,
    p_debt_due_date => p_debt_due_date,
    p_notes => p_notes
  );

  if p_initial_payment > 0 then
    v_payment := public.rpc_add_visit_payment(
      p_visit_id => p_visit_id,
      p_amount => p_initial_payment,
      p_payment_method => p_payment_method,
      p_idempotency_key => p_idempotency_key,
      p_payment_date => p_payment_date,
      p_operation_reference => p_operation_reference,
      p_notes => null
    );
  else
    v_payment := jsonb_build_object(
      'payment_status', v_completion->>'payment_status',
      'total_paid', coalesce((v_completion->>'total_paid')::numeric, 0),
      'payment', null
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id,
    'payment_status', v_payment->>'payment_status',
    'total_paid', coalesce((v_payment->>'total_paid')::numeric, 0),
    'payment', v_payment->'payment',
    'messages_queued', coalesce((v_completion->>'messages_queued')::integer, 0)
  );
end;
$$;

revoke all on function public.trg_sync_visit_payment_status() from public, anon, authenticated;
revoke all on function public.rpc_add_visit_payment(
  uuid, numeric, text, text, timestamptz, text, text
) from public, anon;
revoke all on function public.rpc_complete_visit_with_payment(
  uuid, numeric, text, timestamptz, text, text, boolean, date, text
) from public, anon;

grant execute on function public.rpc_add_visit_payment(
  uuid, numeric, text, text, timestamptz, text, text
) to authenticated;
grant execute on function public.rpc_complete_visit_with_payment(
  uuid, numeric, text, timestamptz, text, text, boolean, date, text
) to authenticated;

notify pgrst, 'reload schema';
