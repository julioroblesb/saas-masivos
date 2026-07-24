-- Generated at UTC: 2026-07-24T11:00:00Z
-- Project ref: ywpafptrcvgoyaoqgzkz
-- Source: live database

SELECT table_name, table_schema, obj_description((table_schema || '.' || table_name)::regclass, 'pg_class') as comment FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;
