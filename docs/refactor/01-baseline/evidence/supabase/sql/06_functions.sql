-- Generated at UTC: 2026-07-24T11:00:00Z
-- Project ref: ywpafptrcvgoyaoqgzkz
-- Source: live database

SELECT p.proname AS function_name, n.nspname AS schema, pg_get_function_result(p.oid) AS return_type, CASE WHEN p.secdef THEN 'YES' ELSE 'NO' END AS is_security_definer, CASE WHEN array_to_string(p.proconfig, ',') LIKE '%search_path%' THEN 'YES' ELSE 'NO' END AS has_search_path, pg_get_function_arguments(p.oid) AS arguments FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';
