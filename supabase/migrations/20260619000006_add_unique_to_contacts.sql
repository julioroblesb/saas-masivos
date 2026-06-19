-- Add unique constraint for company_id and phone in marketing contacts
ALTER TABLE crm_marketing_contacts ADD CONSTRAINT uq_company_phone UNIQUE (company_id, phone);
