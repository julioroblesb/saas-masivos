-- Fix: Allow tenants to insert into crm_wa_queue
CREATE POLICY "crm_wa_queue_tenant_insert" ON crm_wa_queue
  FOR INSERT WITH CHECK (company_id = auth_company_id());
