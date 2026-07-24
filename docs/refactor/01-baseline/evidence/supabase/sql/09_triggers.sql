-- Generated at UTC: 2026-07-24T11:00:00Z
-- Project ref: ywpafptrcvgoyaoqgzkz
-- Source: live database

SELECT trigger_name, event_object_table AS table_name, action_timing || ' ' || event_manipulation AS event, action_statement AS action FROM information_schema.triggers WHERE trigger_schema = 'public';
