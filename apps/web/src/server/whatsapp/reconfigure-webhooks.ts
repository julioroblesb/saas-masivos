import 'server-only';
import { evolution } from '@/integrations/evolution/client';
import { getEnv } from '@/config/env';
import { getTenantWebhookSecret } from '@/server/db/webhook-secrets';
import { createLogger } from '@/server/observability/logger';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

export interface ReconfigureResult {
  companyId: string;
  evolutionInstanceName: string;
  success: boolean;
  error?: string;
}

/**
 * Reconfigures the Evolution API webhooks for all connected WhatsApp instances
 * using their individual 64-hex tenant secrets from wa_webhook_secrets.
 * Non-destructive: failure per instance is logged without disconnecting the session.
 */
export async function reconfigureConnectedWebhooks(appPublicUrlInput?: string): Promise<ReconfigureResult[]> {
  const env = getEnv();
  const baseUrl = appPublicUrlInput ?? env.APP_PUBLIC_URL ?? 'https://saasmasivos.com';
  const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/wa/webhook`;
  const admin = getSupabaseAdmin();
  const logger = createLogger({ operation: 'reconfigure_connected_webhooks' });

  const { data: sessions, error } = await admin
    .from('wa_sessions')
    .select('company_id, evolution_instance_name')
    .eq('status', 'conectado')
    .not('evolution_instance_name', 'is', null);

  if (error || !sessions) {
    logger.error('Failed to query connected wa_sessions for webhook re-configuration', { error });
    throw new Error('No se pudieron consultar las sesiones conectadas');
  }

  const results: ReconfigureResult[] = [];

  for (const session of sessions) {
    const instanceName = session.evolution_instance_name!;
    const companyId = session.company_id;

    try {
      const secret = await getTenantWebhookSecret(companyId);
      await evolution.configureWebhook(instanceName, webhookUrl, secret, companyId);

      logger.info('Successfully reconfigured webhook for connected instance', {
        companyId,
        instanceName,
      });

      results.push({ companyId, evolutionInstanceName: instanceName, success: true });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn('Failed to reconfigure webhook for connected instance', {
        companyId,
        instanceName,
        error: errorMsg,
      });

      results.push({
        companyId,
        evolutionInstanceName: instanceName,
        success: false,
        error: errorMsg,
      });
    }
  }

  return results;
}
