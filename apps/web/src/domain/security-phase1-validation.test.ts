import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security Phase 1 Additive Migration & Logic Static Validation', () => {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const additiveMigrationPath = path.join(migrationsDir, '20260728103000_security_phase1_additive.sql');

  it('1. Deterministic instance naming produces valid company_ prefix without hyphens', () => {
    const companyId = '123e4567-e89b-12d3-a456-426614174000';
    const instanceName = `company_${companyId.replaceAll('-', '')}`;

    expect(instanceName).toBe('company_123e4567e89b12d3a456426614174000');
    expect(instanceName).not.toContain('-');
  });

  it('2. webhook_secret is NOT added to wa_sessions; separate wa_webhook_secrets table is created', () => {
    expect(fs.existsSync(additiveMigrationPath)).toBe(true);
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    // Confirm webhook_secret column is not added to wa_sessions
    expect(sql).not.toMatch(/alter table [^;]*wa_sessions[^;]*add [^;]*webhook_secret/i);

    // Confirm separate table wa_webhook_secrets is created
    expect(sql).toContain('create table if not exists public.wa_webhook_secrets');
    expect(sql).toContain('extensions.gen_random_bytes(32)');
  });

  it('3. wa_webhook_secrets is locked down with REVOKE ALL and no authenticated policies', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    expect(sql).toContain('revoke all on table public.wa_webhook_secrets from anon, authenticated;');
    expect(sql).toContain('grant select, insert, update, delete on table public.wa_webhook_secrets to service_role;');

    // Confirm no policy grants select to authenticated or anon
    expect(sql).not.toMatch(/create policy[\s\S]*on public\.wa_webhook_secrets[\s\S]*to authenticated/i);
    expect(sql).not.toMatch(/create policy[\s\S]*on public\.wa_webhook_secrets[\s\S]*to anon/i);
  });

  it('4. Preserves valid Evolution sessions and resets only legacy sessions', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    expect(sql).toContain('when ws.bb_project_id = e.expected_instance');
    expect(sql).toContain("then ws.status\n    else 'desconectado'");
    expect(sql).toContain("then ws.phone_number\n    else null");
  });

  it('5. Migration does not contain DROP, DROP CASCADE or DML REVOKE statements on spa_visits', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8').toLowerCase();

    expect(sql).not.toContain('drop table');
    expect(sql).not.toContain('drop column');
    expect(sql).not.toMatch(/drop[\s\S]*cascade/);
    expect(sql).not.toContain('revoke insert, update, delete on table public.spa_visits');
  });

  it('6. Additive migration preserves canonical RPC signatures without overloads', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    const completeVisitMatches = sql.match(/create or replace function public\.rpc_complete_visit/g);
    const createCampaignMatches = sql.match(/create or replace function public\.rpc_create_campaign/g);

    expect(completeVisitMatches?.length).toBe(1);
    expect(createCampaignMatches?.length).toBe(1);

    expect(sql).toContain('p_debt_due_date date default null');
    expect(sql).toContain('p_target_raw_phones text[]');
  });

  it('7. rpc_create_campaign validates null delays and upfront sequence content', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    expect(sql).toContain('if p_min_delay_sec is null or p_max_delay_sec is null then');
    expect(sql).toContain('VALIDAR TODOS LOS PASOS ANTES DE CUALQUIER INSERCIÓN');
    expect(sql).toContain('86400000');
  });
});
