-- Migrate RLS to Select Only for Tenant Safety
DROP POLICY IF EXISTS "tenant_isolation_all" ON crm_marketing_contacts;
DROP POLICY IF EXISTS "tenant_isolation_all_camp" ON crm_wa_campaigns;
DROP POLICY IF EXISTS "tenant_isolation_all_queue" ON crm_wa_queue;

-- Add scheduled_for to queue for Anti-Ban Delays
ALTER TABLE crm_wa_queue ADD COLUMN scheduled_for timestamptz DEFAULT now();
CREATE INDEX idx_crm_wa_queue_scheduled ON crm_wa_queue (scheduled_for) WHERE status = 'pendiente';

-- Add min and max delay settings to campaigns
ALTER TABLE crm_wa_campaigns ADD COLUMN min_delay_sec int DEFAULT 45;
ALTER TABLE crm_wa_campaigns ADD COLUMN max_delay_sec int DEFAULT 90;
