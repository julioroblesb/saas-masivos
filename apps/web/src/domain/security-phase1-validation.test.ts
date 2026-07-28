import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security Phase 1 Additive Migration & Bridge Validation', () => {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const additiveMigrationPath = path.join(
    migrationsDir,
    '20260728103000_security_phase1_additive.sql',
  );

  it('1. Synchronizes bb_project_id = e.expected_instance in update bridge', () => {
    expect(fs.existsSync(additiveMigrationPath)).toBe(true);
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    expect(sql).toContain('bb_project_id = e.expected_instance');
  });

  it('2. Preserves valid Evolution sessions using when ws.bb_project_id = e.expected_instance', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    expect(sql).toContain('when ws.bb_project_id = e.expected_instance');
    expect(sql).toMatch(/then ws\.status\r?\n\s+else 'desconectado'/);
    expect(sql).toMatch(/then ws\.phone_number\r?\n\s+else null/);
  });

  it('3. webhook_secret is NOT added to wa_sessions', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    expect(sql).not.toMatch(/alter table [^;]*wa_sessions[^;]*add [^;]*webhook_secret/i);
  });

  it('4. Creates wa_webhook_secrets with RLS, REVOKE ALL for anon/authenticated, and gen_random_bytes(32)', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    expect(sql).toContain('create table if not exists public.wa_webhook_secrets');
    expect(sql).toContain('alter table public.wa_webhook_secrets enable row level security;');
    expect(sql).toContain(
      'revoke all on table public.wa_webhook_secrets from anon, authenticated;',
    );
    expect(sql).toContain(
      'grant select, insert, update, delete on table public.wa_webhook_secrets to service_role;',
    );
    expect(sql).toContain('extensions.gen_random_bytes(32)');
  });

  it('5. Does not contain destructive DROP, CASCADE, DML REVOKE on spa_visits, or non-existent schema objects', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8').toLowerCase();

    // Destructive statement checks
    expect(sql).not.toContain('drop table');
    expect(sql).not.toContain('drop column');
    expect(sql).not.toMatch(/drop\s+table[\s\S]*cascade/i);
    expect(sql).not.toContain('revoke insert, update, delete on table public.spa_visits');

    // Non-existent schema object checks
    expect(sql).not.toContain('spa_visit_audit');
    expect(sql).not.toContain('crm_campaigns');
    expect(sql).not.toContain('spa_visits.amount_paid');
    expect(sql).not.toContain('crm_wa_queue.step_index');
    expect(sql).not.toContain('crm_wa_queue.scheduled_at');
    expect(sql).not.toContain('crm_wa_queue.payload');
  });

  it('6. Preserves canonical 6-parameter signatures for rpc_complete_visit and rpc_create_campaign', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    const completeVisitMatches = sql.match(
      /create or replace function public\.rpc_complete_visit/g,
    );
    const createCampaignMatches = sql.match(
      /create or replace function public\.rpc_create_campaign/g,
    );

    expect(completeVisitMatches?.length).toBe(1);
    expect(createCampaignMatches?.length).toBe(1);

    // Canonical 6 parameters check
    expect(sql).toContain('p_debt_due_date date default null');
    expect(sql).toContain('p_target_raw_phones text[]');
  });
});
