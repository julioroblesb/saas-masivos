import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

export type DatabaseServer = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      wa_webhook_secrets: {
        Row: {
          company_id: string;
          created_at: string;
          rotated_at: string;
          secret: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          rotated_at?: string;
          secret: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          rotated_at?: string;
          secret?: string;
        };
        Relationships: [];
      };
    };
  };
};

export interface WebhookSecretRow {
  company_id: string;
  secret: string;
  created_at: string;
  rotated_at: string;
}

/**
 * Exclusively retrieves or provisions the per-tenant 64-hex-character webhook secret
 * using Supabase Admin (service_role). Never exposed to browser/authenticated clients.
 */
export async function getTenantWebhookSecret(companyId: string): Promise<string> {
  const admin = getSupabaseAdmin() as unknown as SupabaseClient<DatabaseServer>;
  const { data } = await admin
    .from('wa_webhook_secrets')
    .select('secret')
    .eq('company_id', companyId)
    .maybeSingle();

  if (data?.secret) {
    return data.secret;
  }

  // Generate 64-hex character secret (32 random bytes)
  const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { error: insertError } = await admin.from('wa_webhook_secrets').insert({
    company_id: companyId,
    secret: newSecret,
  });

  if (insertError) {
    const { data: existing } = await admin
      .from('wa_webhook_secrets')
      .select('secret')
      .eq('company_id', companyId)
      .maybeSingle();
    if (existing?.secret) return existing.secret;
    throw new Error(`No se pudo obtener el secreto de webhook para la empresa ${companyId}`);
  }

  return newSecret;
}
