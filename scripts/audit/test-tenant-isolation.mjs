import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ywpafptrcvgoyaoqgzkz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_lPk_0-WT6hY3o1IQ_4uI9g_4oZ6kdmR';
const TENANT_A_EMAIL = process.env.TENANT_A_EMAIL || 'silvana@gmail.com';
const TENANT_A_PASSWORD = process.env.TENANT_A_PASSWORD || 'Skyrote';
const TENANT_B_EMAIL = process.env.TENANT_B_EMAIL || 'francisco@gmail.com';
const TENANT_B_PASSWORD = process.env.TENANT_B_PASSWORD || 'Skyrote';

const results = [];

function recordResult(id, actor, resource, operation, httpStatus, returnedRows, expected, passed) {
  results.push({
    id,
    actor,
    resource,
    operation,
    httpStatus,
    returnedRows,
    expected,
    passed
  });
}

async function runAudit() {
  console.log('Starting automated RLS isolation audit against live Supabase database...');

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Anon tests
  const tablesToTestAnon = [
    { name: 'companies', id: 'ANON-001' },
    { name: 'profiles', id: 'ANON-002' },
    { name: 'crm_marketing_contacts', id: 'ANON-003' },
    { name: 'spa_visits', id: 'ANON-004' },
    { name: 'spa_payments', id: 'ANON-005' },
    { name: 'crm_wa_campaigns', id: 'ANON-006' },
    { name: 'wa_sessions', id: 'ANON-007' }
  ];

  for (const t of tablesToTestAnon) {
    const { data, error, status } = await anonClient.from(t.name).select('*');
    const rows = data ? data.length : 0;
    const passed = rows === 0 || error !== null;
    recordResult(t.id, 'anon', t.name, 'select', status || 200, rows, 'deny_or_zero_rows', passed);
  }

  // Anon RPC test
  const { data: rpcData, error: rpcErr, status: rpcStatus } = await anonClient.rpc('search_contacts', { p_query: 'test' });
  const rpcRows = rpcData ? rpcData.length : 0;
  recordResult('ANON-RPC-001', 'anon', 'search_contacts', 'rpc_execute', rpcStatus || 200, rpcRows, 'deny_access', rpcErr !== null);

  // 2. Tenant A authentication
  const tenantAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authA, error: authAErr } = await tenantAClient.auth.signInWithPassword({
    email: TENANT_A_EMAIL,
    password: TENANT_A_PASSWORD
  });

  if (authAErr) {
    console.error('Tenant A Auth Failed:', authAErr);
    return;
  }

  const tenantA_companyId = '3c3cb849-06c8-4250-b4cf-9375422684a6';
  const tenantB_companyId = '1e3edd91-ef14-4b19-a165-f188ef5cb50a';

  // Tenant A own data
  const { data: ownContacts, status: sOwn } = await tenantAClient.from('crm_marketing_contacts').select('*').eq('company_id', tenantA_companyId);
  recordResult('TEN-001', 'tenant_a', 'crm_marketing_contacts', 'select_own_tenant', sOwn || 200, ownContacts ? ownContacts.length : 0, 'allow_own_rows', (ownContacts ? ownContacts.length : 0) > 0);

  // Tenant A cross-tenant selects
  const crossTables = [
    { name: 'crm_marketing_contacts', id: 'TEN-002' },
    { name: 'spa_visits', id: 'TEN-003' },
    { name: 'spa_payments', id: 'TEN-004' },
    { name: 'crm_wa_campaigns', id: 'TEN-005' },
    { name: 'wa_sessions', id: 'TEN-006' }
  ];

  for (const ct of crossTables) {
    const { data, status } = await tenantAClient.from(ct.name).select('*').eq('company_id', tenantB_companyId);
    const rows = data ? data.length : 0;
    recordResult(ct.id, 'tenant_a', ct.name, 'select_cross_tenant', status || 200, rows, 'deny_or_zero_rows', rows === 0);
  }

  // Tenant A cross-tenant UPDATE
  const { data: upData, status: sUp } = await tenantAClient
    .from('crm_marketing_contacts')
    .update({ first_name: 'HackedByTenantA' })
    .eq('company_id', tenantB_companyId)
    .select();

  const upRows = upData ? upData.length : 0;
  recordResult('TEN-007', 'tenant_a', 'crm_marketing_contacts', 'update_cross_tenant', sUp || 200, upRows, 'deny_or_zero_rows', upRows === 0);

  // Save evidence json
  const evidenceDir = path.join(process.cwd(), 'docs/refactor/01-baseline/evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'rls-test-results.json'), JSON.stringify(results, null, 2));

  console.log(`RLS Isolation Audit completed! Recorded ${results.length} test cases in docs/refactor/01-baseline/evidence/rls-test-results.json`);
}

runAudit();
