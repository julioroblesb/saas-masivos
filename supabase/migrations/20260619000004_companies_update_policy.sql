-- Add UPDATE policy for companies
create policy "companies_tenant_update" on companies
  for update using (id = auth_company_id());
