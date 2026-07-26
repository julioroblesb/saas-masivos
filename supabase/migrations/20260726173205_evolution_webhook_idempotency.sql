create table public.wa_webhook_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null default 'evolution',
  event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint wa_webhook_events_provider_check
    check (provider = 'evolution'),
  constraint wa_webhook_events_event_id_check
    check (char_length(event_id) between 1 and 512),
  constraint wa_webhook_events_event_type_check
    check (char_length(event_type) between 1 and 128),
  constraint wa_webhook_events_payload_hash_check
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint wa_webhook_events_company_provider_event_key
    unique (company_id, provider, event_id)
);

create index wa_webhook_events_expires_at_idx
  on public.wa_webhook_events (expires_at);

alter table public.wa_webhook_events enable row level security;

revoke all on table public.wa_webhook_events from public, anon, authenticated;
revoke all on sequence public.wa_webhook_events_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.wa_webhook_events to service_role;
grant usage, select on sequence public.wa_webhook_events_id_seq to service_role;

create or replace function public.rpc_claim_evolution_webhook(
  p_company_id uuid,
  p_event_id text,
  p_event_type text,
  p_payload_sha256 text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.wa_webhook_events (
    company_id,
    provider,
    event_id,
    event_type,
    payload_sha256
  )
  values (
    p_company_id,
    'evolution',
    p_event_id,
    p_event_type,
    p_payload_sha256
  )
  on conflict (company_id, provider, event_id) do nothing;

  return found;
end;
$$;

create or replace function public.rpc_complete_evolution_webhook(
  p_company_id uuid,
  p_event_id text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.wa_webhook_events
     set processed_at = coalesce(processed_at, now())
   where company_id = p_company_id
     and provider = 'evolution'
     and event_id = p_event_id;
$$;

revoke all on function public.rpc_claim_evolution_webhook(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.rpc_complete_evolution_webhook(uuid, text)
  from public, anon, authenticated;
grant execute on function public.rpc_claim_evolution_webhook(uuid, text, text, text)
  to service_role;
grant execute on function public.rpc_complete_evolution_webhook(uuid, text)
  to service_role;

comment on table public.wa_webhook_events is
  'Short-lived Evolution webhook idempotency ledger; payloads are never stored.';
