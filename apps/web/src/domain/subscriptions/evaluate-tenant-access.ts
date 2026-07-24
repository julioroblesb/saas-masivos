export type AdministrativeStatus = 'activa' | 'suspendida' | 'cancelada';

export type TenantAccessReason =
  | 'active'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'subscription_not_configured'
  | 'invalid_status';

interface CompanySubscription {
  status: string | null;
  subscription_end_at: string | null;
}

export interface TenantAccessResult {
  allowed: boolean;
  reason: TenantAccessReason;
  expiresAt: Date | null;
}

export function evaluateTenantAccess(
  company: CompanySubscription,
  now = new Date()
): TenantAccessResult {
  const status = company.status?.toLowerCase() || '';

  if (status === 'suspendida' || status === 'suspended' || status === 'inactive') {
    return {
      allowed: false,
      reason: 'suspended',
      expiresAt: parseExpiration(company.subscription_end_at),
    };
  }

  if (status === 'cancelada' || status === 'cancelled' || status === 'canceled') {
    return {
      allowed: false,
      reason: 'cancelled',
      expiresAt: parseExpiration(company.subscription_end_at),
    };
  }

  if (status !== 'activa' && status !== 'active') {
    return {
      allowed: false,
      reason: 'invalid_status',
      expiresAt: parseExpiration(company.subscription_end_at),
    };
  }

  const expiresAt = parseExpiration(company.subscription_end_at);

  if (!expiresAt) {
    return {
      allowed: false,
      reason: 'subscription_not_configured',
      expiresAt: null,
    };
  }

  if (expiresAt.getTime() <= now.getTime()) {
    return {
      allowed: false,
      reason: 'expired',
      expiresAt,
    };
  }

  return {
    allowed: true,
    reason: 'active',
    expiresAt,
  };
}

function parseExpiration(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
