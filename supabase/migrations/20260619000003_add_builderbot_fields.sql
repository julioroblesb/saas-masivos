ALTER TABLE wa_sessions 
ADD COLUMN IF NOT EXISTS bb_project_id text,
ADD COLUMN IF NOT EXISTS bb_host text;
