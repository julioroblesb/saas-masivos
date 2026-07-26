import { describe, expect, it } from 'vitest';
import { evaluateAccessRecord, type TenantAccessRecord } from './tenant-access';

const now = new Date('2026-07-26T12:00:00.000Z');
const activeOwner: TenantAccessRecord = {
  user_id: 'user-a',
  company_id: 'company-a',
  app_role: 'owner',
  company_status: 'activa',
  plan_type: 'mensual',
  subscription_start_at: '2026-07-01T00:00:00.000Z',
  subscription_end_at: '2026-08-01T00:00:00.000Z',
  timezone: 'America/Lima',
  is_demo: false,
};

describe('evaluateAccessRecord', () => {
  it('allows an active owner with management permissions', () => {
    const result = evaluateAccessRecord(activeOwner, now);
    expect(result).toMatchObject({
      allowed: true,
      state: 'paid',
      role: 'owner',
      canManageCompany: true,
      canManageUsers: true,
      canUseWhatsApp: true,
    });
  });

  it('allows an employee without owner permissions', () => {
    const result = evaluateAccessRecord({ ...activeOwner, app_role: 'employee' }, now);
    expect(result).toMatchObject({
      allowed: true,
      role: 'employee',
      canManageCompany: false,
      canManageUsers: false,
      canUseWhatsApp: true,
    });
  });

  it.each([
    ['suspendida', 'suspended'],
    ['cancelada', 'cancelled'],
  ] as const)('denies a %s tenant', (company_status, state) => {
    expect(evaluateAccessRecord({ ...activeOwner, company_status }, now)).toMatchObject({
      allowed: false,
      state,
    });
  });

  it('denies an expired subscription', () => {
    expect(
      evaluateAccessRecord(
        {
          ...activeOwner,
          subscription_end_at: '2026-07-26T11:59:59.000Z',
        },
        now,
      ),
    ).toMatchObject({ allowed: false, state: 'expired' });
  });

  it('classifies demo and trial plans', () => {
    expect(
      evaluateAccessRecord({ ...activeOwner, plan_type: 'demo', is_demo: true }, now).state,
    ).toBe('demo');
    expect(evaluateAccessRecord({ ...activeOwner, plan_type: 'prueba' }, now).state).toBe('trial');
  });

  it('allows a superadmin without a company', () => {
    expect(
      evaluateAccessRecord(
        {
          ...activeOwner,
          company_id: null,
          app_role: 'super_admin',
          company_status: null,
          plan_type: null,
          subscription_start_at: null,
          subscription_end_at: null,
        },
        now,
      ),
    ).toMatchObject({
      allowed: true,
      state: 'super_admin',
      role: 'super_admin',
    });
  });

  it('denies missing profiles and invalid roles', () => {
    expect(evaluateAccessRecord(null, now).state).toBe('profile_missing');
    expect(evaluateAccessRecord({ ...activeOwner, app_role: 'unknown' }, now).state).toBe(
      'invalid_role',
    );
  });
});
