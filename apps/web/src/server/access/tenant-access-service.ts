import 'server-only';

import { createClient } from '@/utils/supabase/server';
import {
  evaluateAccessRecord,
  type AppRole,
  type TenantAccessContext,
  type TenantAccessRecord,
} from '@/domain/access/tenant-access';

export class TenantAccessService {
  static async forCurrentUser(): Promise<TenantAccessContext> {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return evaluateAccessRecord(null);
    }

    const { data, error } = await supabase.rpc('rpc_get_my_access_context');
    if (error) {
      throw new Error('Unable to resolve tenant access', { cause: error });
    }

    return evaluateAccessRecord((data?.[0] as TenantAccessRecord | undefined) ?? null);
  }

  static async allows(...roles: AppRole[]): Promise<TenantAccessContext> {
    const access = await this.forCurrentUser();
    if (!access.allowed || !access.role || !roles.includes(access.role)) {
      return { ...access, allowed: false };
    }
    return access;
  }
}
