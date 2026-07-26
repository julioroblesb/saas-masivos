export type AppRole = 'super_admin' | 'owner' | 'employee';
export type TenantPlan =
  'demo' | 'prueba' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export type TenantAccessState =
  | 'super_admin'
  | 'demo'
  | 'trial'
  | 'paid'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'profile_missing'
  | 'company_missing'
  | 'invalid_role'
  | 'invalid_status';

export interface TenantAccessRecord {
  user_id: string;
  company_id: string | null;
  app_role: string;
  company_status: string | null;
  plan_type: string | null;
  subscription_start_at: string | null;
  subscription_end_at: string | null;
  timezone: string | null;
  is_demo: boolean | null;
}

export interface TenantAccessContext {
  allowed: boolean;
  state: TenantAccessState;
  userId: string | null;
  companyId: string | null;
  role: AppRole | null;
  plan: TenantPlan | null;
  timezone: string;
  expiresAt: Date | null;
  canManageCompany: boolean;
  canManageUsers: boolean;
  canUseWhatsApp: boolean;
}

const DEFAULT_TIMEZONE = 'America/Lima';
const APP_ROLES = new Set<AppRole>(['super_admin', 'owner', 'employee']);
const PLANS = new Set<TenantPlan>([
  'demo',
  'prueba',
  'mensual',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
]);

export function evaluateAccessRecord(
  record: TenantAccessRecord | null,
  now = new Date(),
): TenantAccessContext {
  if (!record) return denied('profile_missing');

  const role = APP_ROLES.has(record.app_role as AppRole) ? (record.app_role as AppRole) : null;

  if (!role) {
    return denied('invalid_role', record);
  }

  if (role === 'super_admin') {
    return {
      ...base(record, role),
      allowed: true,
      state: 'super_admin',
      canManageCompany: true,
      canManageUsers: true,
      canUseWhatsApp: false,
    };
  }

  if (!record.company_id) {
    return denied('company_missing', record, role);
  }

  if (record.company_status === 'suspendida') {
    return denied('suspended', record, role);
  }

  if (record.company_status === 'cancelada') {
    return denied('cancelled', record, role);
  }

  if (record.company_status !== 'activa') {
    return denied('invalid_status', record, role);
  }

  const expiresAt = parseDate(record.subscription_end_at);
  if (!expiresAt || expiresAt.getTime() <= now.getTime()) {
    return denied('expired', record, role);
  }

  const plan = PLANS.has(record.plan_type as TenantPlan) ? (record.plan_type as TenantPlan) : null;
  const state: TenantAccessState =
    record.is_demo || plan === 'demo' ? 'demo' : plan === 'prueba' ? 'trial' : 'paid';

  return {
    ...base(record, role),
    allowed: true,
    state,
    plan,
    expiresAt,
    canManageCompany: role === 'owner',
    canManageUsers: role === 'owner',
    canUseWhatsApp: true,
  };
}

function denied(
  state: TenantAccessState,
  record?: TenantAccessRecord,
  role: AppRole | null = null,
): TenantAccessContext {
  return {
    ...base(record, role),
    allowed: false,
    state,
    canManageCompany: false,
    canManageUsers: false,
    canUseWhatsApp: false,
  };
}

function base(
  record?: TenantAccessRecord,
  role: AppRole | null = null,
): Omit<
  TenantAccessContext,
  'allowed' | 'state' | 'canManageCompany' | 'canManageUsers' | 'canUseWhatsApp'
> {
  return {
    userId: record?.user_id ?? null,
    companyId: record?.company_id ?? null,
    role,
    plan:
      record && PLANS.has(record.plan_type as TenantPlan) ? (record.plan_type as TenantPlan) : null,
    timezone: record?.timezone || DEFAULT_TIMEZONE,
    expiresAt: parseDate(record?.subscription_end_at ?? null),
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
