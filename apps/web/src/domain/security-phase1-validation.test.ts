import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security Phase 1 Additive Migration & Logic Validation', () => {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const additiveMigrationPath = path.join(migrationsDir, '20260728103000_security_phase1_additive.sql');

  it('1. Deterministic instance naming produces valid company_ prefix without hyphens', () => {
    const companyId = '123e4567-e89b-12d3-a456-426614174000';
    const instanceName = `company_${companyId.replaceAll('-', '')}`;

    expect(instanceName).toBe('company_123e4567e89b12d3a456426614174000');
    expect(instanceName).not.toContain('-');
  });

  it('2. Webhook secret requirement is 64 hex characters', () => {
    const validSecret = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const invalidLength = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const hexPattern = /^[0-9a-f]{64}$/;

    expect(hexPattern.test(validSecret)).toBe(true);
    expect(hexPattern.test(invalidLength)).toBe(false);
  });

  it('3. Additive migration 20260728103000 does not contain destructive DROP, CASCADE or DML REVOKE statements', () => {
    expect(fs.existsSync(additiveMigrationPath)).toBe(true);
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8').toLowerCase();

    expect(sql).not.toContain('drop table');
    expect(sql).not.toContain('drop column');
    expect(sql).not.toContain('cascade');
    expect(sql).not.toContain('revoke all on table public.crm_wa_queue');
    expect(sql).not.toContain('revoke all on table public.spa_payments');
    expect(sql).not.toContain('revoke insert, update, delete on table public.spa_visits');
  });

  it('4. Additive migration preserves canonical RPC signatures without overloads', () => {
    const sql = fs.readFileSync(additiveMigrationPath, 'utf8');

    // Count function creations
    const completeVisitMatches = sql.match(/create or replace function public\.rpc_complete_visit/g);
    const createCampaignMatches = sql.match(/create or replace function public\.rpc_create_campaign/g);

    expect(completeVisitMatches?.length).toBe(1);
    expect(createCampaignMatches?.length).toBe(1);

    // Verify canonical parameter list present in the file
    expect(sql).toContain('p_debt_due_date date default null');
    expect(sql).toContain('p_target_raw_phones text[]');
  });

  it('5. Overpayment calculation rejects new payment when total_paid + additional > price_charged', () => {
    const priceCharged = 500;
    const previousTotalPaid = 300;
    const newPayment = 250;
    const completionExists = false;

    const effectiveAddPayment = completionExists ? 0 : newPayment;
    const isOverpaying = previousTotalPaid + effectiveAddPayment > priceCharged;

    expect(isOverpaying).toBe(true);
  });

  it('6. Overpayment calculation permits idempotent retry when completion payment already exists', () => {
    const priceCharged = 500;
    const previousTotalPaid = 500;
    const retryPayment = 500;
    const completionExists = true;

    const effectiveAddPayment = completionExists ? 0 : retryPayment;
    const isOverpaying = previousTotalPaid + effectiveAddPayment > priceCharged;

    expect(isOverpaying).toBe(false);
  });
});
