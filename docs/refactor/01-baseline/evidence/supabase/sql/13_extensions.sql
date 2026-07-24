-- Generated at UTC: 2026-07-24T11:00:00Z
-- Project ref: ywpafptrcvgoyaoqgzkz
-- Source: live database

SELECT extname AS extension_name, nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace;
