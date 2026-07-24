select
  p.oid::bigint as oid,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_arguments(p.oid) as full_arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as security_definer,
  r.rolname as owner,
  p.proconfig,
  has_function_privilege(
    'anon',
    p.oid,
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    p.oid,
    'EXECUTE'
  ) as authenticated_can_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
join pg_roles r
  on r.oid = p.proowner
where n.nspname = 'public'
order by
  p.proname,
  pg_get_function_identity_arguments(p.oid);
