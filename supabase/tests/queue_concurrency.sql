begin;

select plan(5);

insert into public.crm_wa_queue (
  id,
  company_id,
  contact_id,
  phone,
  message,
  status,
  scheduled_for,
  next_attempt_at,
  idempotency_key,
  message_type
)
values (
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010',
  '51999999999',
  'queue concurrency test',
  'queued',
  now() - interval '1 second',
  now() - interval '1 second',
  'queue-concurrency-test',
  'transactional'
);

select is(
  (
    select count(*)
    from public.rpc_claim_queue_item(
      '00000000-0000-4000-8000-000000000001',
      'worker-a',
      90,
      true
    )
  ),
  1::bigint,
  'first worker claims one item'
);
select is(
  (
    select count(*)
    from public.rpc_claim_queue_item(
      '00000000-0000-4000-8000-000000000001',
      'worker-b',
      90,
      true
    )
  ),
  0::bigint,
  'second worker cannot double-claim'
);
select is(
  (
    select lease_owner
    from public.crm_wa_queue
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  'worker-a',
  'lease ownership is preserved'
);
select ok(
  public.rpc_mark_queue_processing(
    '20000000-0000-4000-8000-000000000001',
    'worker-a'
  ),
  'lease owner can start processing'
);
select ok(
  public.rpc_complete_queue_item(
    '20000000-0000-4000-8000-000000000001',
    'worker-a',
    'provider-test-id'
  ),
  'lease owner can complete the item'
);

select * from finish();
rollback;
