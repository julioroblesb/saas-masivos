-- Migration: P0 Security Hardening and Legacy Cleanup
-- Version: 20260728100000

-- 1. Legacy Cleanup
DROP TABLE IF EXISTS public.wa_auth_state CASCADE;
ALTER TABLE public.wa_sessions DROP COLUMN IF EXISTS bb_host;

-- 2. Add evolution_instance_name & webhook_secret to wa_sessions
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS evolution_instance_name text;
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS webhook_secret text;

-- Backfill evolution_instance_name from bb_project_id
UPDATE public.wa_sessions
SET evolution_instance_name = bb_project_id
WHERE evolution_instance_name IS NULL AND bb_project_id IS NOT NULL;

-- Backfill webhook_secret with gen_random_uuid / random string
UPDATE public.wa_sessions
SET webhook_secret = md5(company_id::text || clock_timestamp()::text)
WHERE webhook_secret IS NULL;

-- Create partial unique index on evolution_instance_name
CREATE UNIQUE INDEX IF NOT EXISTS wa_sessions_evolution_instance_name_idx
ON public.wa_sessions (evolution_instance_name)
WHERE evolution_instance_name IS NOT NULL;

-- 3. Revoke Direct DML & TRUNCATE (P0 Security Lockdown)
REVOKE ALL ON TABLE public.crm_wa_queue FROM anon, authenticated;
REVOKE ALL ON TABLE public.spa_payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.spa_visits FROM anon, authenticated;

-- Grant explicit SELECT to authenticated for UI data fetching
GRANT SELECT ON public.crm_wa_queue, public.spa_payments, public.spa_visits TO authenticated;

-- Revoke TRUNCATE across public schema
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 4. Fix Overpayment in rpc_complete_visit (P0 Security)
CREATE OR REPLACE FUNCTION public.rpc_complete_visit(
  p_visit_id uuid,
  p_initial_payment numeric DEFAULT 0,
  p_payment_method text DEFAULT 'efectivo'::text,
  p_completed_at timestamptz DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_company_id uuid;
  v_visit record;
  v_effective_completed_at timestamptz;
  v_already_paid numeric;
  v_new_total_paid numeric;
  v_new_payment_status text;
  v_effective_price numeric;
BEGIN
  SELECT p.company_id
    INTO v_company_id
    FROM public.profiles as p
   WHERE p.id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT *
    INTO v_visit
    FROM public.spa_visits
   WHERE id = p_visit_id
     AND company_id = v_company_id
   FOR UPDATE;

  IF v_visit.id IS NULL THEN
    RAISE EXCEPTION 'Visit not found or not owned';
  END IF;

  v_effective_price := COALESCE(v_visit.price_charged, 0);

  -- Calculate accumulated previous payments
  SELECT COALESCE(SUM(amount), 0)
    INTO v_already_paid
    FROM public.spa_payments
   WHERE visit_id = p_visit_id;

  v_new_total_paid := v_already_paid + COALESCE(p_initial_payment, 0);

  IF v_new_total_paid > v_effective_price THEN
    RAISE EXCEPTION 'El pago acumulado (S/ %) supera el precio del servicio (S/ %)', v_new_total_paid, v_effective_price;
  END IF;

  IF p_initial_payment < 0 THEN
    RAISE EXCEPTION 'El monto inicial no puede ser negativo';
  END IF;

  v_effective_completed_at := COALESCE(p_completed_at, clock_timestamp());

  IF v_new_total_paid >= v_effective_price THEN
    v_new_payment_status := 'pagado';
  ELSIF v_new_total_paid > 0 THEN
    v_new_payment_status := 'parcial';
  ELSE
    v_new_payment_status := 'pendiente';
  END IF;

  UPDATE public.spa_visits
     SET status = 'completado',
         completed_at = v_effective_completed_at,
         amount_paid = v_new_total_paid,
         payment_status = v_new_payment_status
   WHERE id = p_visit_id;

  IF p_initial_payment > 0 THEN
    INSERT INTO public.spa_payments (
      company_id,
      visit_id,
      amount,
      payment_method,
      notes
    ) VALUES (
      v_company_id,
      p_visit_id,
      p_initial_payment,
      COALESCE(p_payment_method, 'efectivo'),
      'Pago inicial al completar atención'
    );
  END IF;

  INSERT INTO public.spa_visit_audit (
    company_id,
    visit_id,
    changed_by,
    previous_status,
    new_status,
    notes
  ) VALUES (
    v_company_id,
    p_visit_id,
    auth.uid(),
    v_visit.status,
    'completado',
    'Atención completada via RPC rpc_complete_visit'
  );

  RETURN jsonb_build_object(
    'visit_id', p_visit_id,
    'status', 'completado',
    'completed_at', v_effective_completed_at,
    'amount_paid', v_new_total_paid,
    'payment_status', v_new_payment_status
  );
END;
$function$;

-- 5. Anti-Explosion Limits on rpc_create_campaign (Vulnerability 13)
CREATE OR REPLACE FUNCTION public.rpc_create_campaign(
  p_name text,
  p_sequence jsonb,
  p_target_contact_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_company_id uuid;
  v_campaign_id uuid;
  v_contact_count integer;
  v_step_count integer;
  v_total_rows integer;
BEGIN
  SELECT p.company_id
    INTO v_company_id
    FROM public.profiles as p
   WHERE p.id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_step_count := jsonb_array_length(p_sequence);
  IF v_step_count IS NULL OR v_step_count = 0 THEN
    RAISE EXCEPTION 'La campaña debe tener al menos 1 paso';
  END IF;

  IF v_step_count > 10 THEN
    RAISE EXCEPTION 'El número máximo de pasos por campaña es 10';
  END IF;

  IF p_target_contact_ids IS NOT NULL AND array_length(p_target_contact_ids, 1) > 0 THEN
    v_contact_count := array_length(p_target_contact_ids, 1);
  ELSE
    SELECT count(*)::integer
      INTO v_contact_count
      FROM public.crm_marketing_contacts
     WHERE company_id = v_company_id
       AND is_archived = false;
  END IF;

  v_total_rows := v_contact_count * v_step_count;
  IF v_total_rows > 5000 THEN
    RAISE EXCEPTION 'La campaña excede el límite máximo de 5000 mensajes programados';
  END IF;

  INSERT INTO public.crm_campaigns (company_id, name, sequence)
  VALUES (v_company_id, p_name, p_sequence)
  RETURNING id INTO v_campaign_id;

  IF p_target_contact_ids IS NOT NULL AND array_length(p_target_contact_ids, 1) > 0 THEN
    INSERT INTO public.crm_wa_queue (company_id, contact_id, campaign_id, step_index, scheduled_at, payload)
    SELECT
      v_company_id,
      c.id,
      v_campaign_id,
      (s.step->>'step')::integer,
      clock_timestamp() + ((s.step->>'delay_hours')::integer * interval '1 hour'),
      jsonb_build_object('message', s.step->>'message')
    FROM public.crm_marketing_contacts c
    CROSS JOIN jsonb_array_elements(p_sequence) WITH ORDINALITY AS s(step, ord)
    WHERE c.id = ANY(p_target_contact_ids)
      AND c.company_id = v_company_id
      AND c.is_archived = false;
  ELSE
    INSERT INTO public.crm_wa_queue (company_id, contact_id, campaign_id, step_index, scheduled_at, payload)
    SELECT
      v_company_id,
      c.id,
      v_campaign_id,
      (s.step->>'step')::integer,
      clock_timestamp() + ((s.step->>'delay_hours')::integer * interval '1 hour'),
      jsonb_build_object('message', s.step->>'message')
    FROM public.crm_marketing_contacts c
    CROSS JOIN jsonb_array_elements(p_sequence) WITH ORDINALITY AS s(step, ord)
    WHERE c.company_id = v_company_id
      AND c.is_archived = false;
  END IF;

  RETURN v_campaign_id;
END;
$function$;
