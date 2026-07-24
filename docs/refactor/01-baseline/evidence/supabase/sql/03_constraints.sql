-- Generated at UTC: 2026-07-24T11:00:00Z
-- Project ref: ywpafptrcvgoyaoqgzkz
-- Source: live database

SELECT conname AS constraint_name, relname AS table_name, contype AS constraint_type, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class cl ON cl.oid = c.conrelid JOIN pg_namespace n ON n.oid = cl.relnamespace WHERE n.nspname = 'public' ORDER BY relname, conname;
