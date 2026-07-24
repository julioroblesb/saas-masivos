-- Generated at UTC: 2026-07-24T11:00:00Z
-- Project ref: ywpafptrcvgoyaoqgzkz
-- Source: live database

SELECT indexname AS index_name, tablename AS table_name, indisunique AS is_unique, indisprimary AS is_primary, indexdef AS definition FROM pg_indexes i JOIN pg_index idx ON idx.indexrelid = (i.schemaname || '.' || i.indexname)::regclass WHERE schemaname = 'public';
