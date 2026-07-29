create table public.app_audit_events (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  correlation_id text not null,
  event_type text not null,
  entity_type text,
  entity_id text,
  outcome text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint app_audit_events_correlation_check
    check (char_length(correlation_id) between 1 and 128),
  constraint app_audit_events_event_type_check
    check (char_length(event_type) between 1 and 128),
  constraint app_audit_events_outcome_check
    check (outcome in ('success', 'failure')),
  constraint app_audit_events_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create index app_audit_events_company_created_idx
  on public.app_audit_events (company_id, created_at desc);

create index app_audit_events_actor_created_idx
  on public.app_audit_events (actor_id, created_at desc);

create index app_audit_events_correlation_idx
  on public.app_audit_events (correlation_id);

create index app_audit_events_created_idx
  on public.app_audit_events (created_at);

alter table public.app_audit_events enable row level security;

revoke all on table public.app_audit_events from public, anon, authenticated;
revoke all on sequence public.app_audit_events_id_seq from public, anon, authenticated;
grant select, insert, delete on table public.app_audit_events to service_role;
grant usage, select on sequence public.app_audit_events_id_seq to service_role;

create or replace function public.rpc_purge_expired_audit_events(
  p_retention_days integer default 90
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  if p_retention_days < 30 or p_retention_days > 3650 then
    raise exception 'retention days out of range';
  end if;

  delete from public.app_audit_events
  where created_at < now() - make_interval(days => p_retention_days);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.rpc_purge_expired_audit_events(integer)
  from public, anon, authenticated;
grant execute on function public.rpc_purge_expired_audit_events(integer)
  to service_role;

comment on table public.app_audit_events is
  'Append-only application and superadmin audit trail. Metadata must exclude secrets and direct contact data.';
