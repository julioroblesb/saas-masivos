-- Produces the same stable catalog shape stored under snapshots/.
with catalog_objects as (
  select
    'table'::text as kind,
    c.relname::text as name,
    md5(
      string_agg(
        a.attname || ':' ||
        pg_catalog.format_type(a.atttypid, a.atttypmod) || ':' ||
        a.attnotnull::text || ':' ||
        coalesce(pg_get_expr(d.adbin, d.adrelid), ''),
        '|' order by a.attnum
      )
    ) as fingerprint
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a
    on a.attrelid = c.oid
   and a.attnum > 0
   and not a.attisdropped
  left join pg_attrdef d
    on d.adrelid = c.oid
   and d.adnum = a.attnum
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
  group by c.relname

  union all

  select
    'constraint',
    con.conname,
    md5(pg_get_constraintdef(con.oid, true))
  from pg_constraint con
  join pg_namespace n on n.oid = con.connamespace
  where n.nspname = 'public'

  union all

  select 'index', indexname, md5(indexdef)
  from pg_indexes
  where schemaname = 'public'

  union all

  select
    'function',
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    md5(pg_get_functiondef(p.oid))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'

  union all

  select
    'policy',
    tablename || '.' || policyname,
    md5(
      cmd || ':' ||
      coalesce(array_to_string(roles, ','), '') || ':' ||
      coalesce(qual, '') || ':' ||
      coalesce(with_check, '')
    )
  from pg_policies
  where schemaname = 'public'

  union all

  select 'view', viewname, md5(definition)
  from pg_views
  where schemaname = 'public'

  union all

  select
    'trigger',
    event_object_table || '.' || trigger_name,
    md5(
      action_timing || ':' ||
      event_manipulation || ':' ||
      action_statement
    )
  from information_schema.triggers
  where trigger_schema = 'public'
)
select jsonb_pretty(
  jsonb_build_object(
    'project_ref', 'PROJECT_REF',
    'postgres_version', current_setting('server_version'),
    'object_count', count(*),
    'objects',
    jsonb_agg(
      jsonb_build_object(
        'kind', kind,
        'name', name,
        'fingerprint', fingerprint
      )
      order by kind, name
    )
  )
)
from catalog_objects;
