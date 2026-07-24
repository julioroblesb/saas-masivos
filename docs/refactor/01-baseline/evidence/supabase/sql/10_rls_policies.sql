-- Generated at UTC: 2026-07-24T11:00:00Z
-- Project ref: ywpafptrcvgoyaoqgzkz
-- Source: live database

SELECT policyname AS policy_name, tablename AS table_name, roles::text, cmd, qual::text AS using_expr, with_check::text AS check_expr FROM pg_policies WHERE schemaname = 'public';
