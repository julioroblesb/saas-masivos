import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/config/env';
import { bearerToken, secretsMatch } from '@/server/security/secrets';
import { reconfigureConnectedWebhooks } from '@/server/whatsapp/reconfigure-webhooks';
import { createLogger } from '@/server/observability/logger';
import { createClient } from '@/utils/supabase/server';

let lastExecutionTime = 0;
const COOLDOWN_MS = 60_000; // 60s rate limit cooldown

/**
 * Controlled superadmin/internal route to trigger webhook reconfiguration for all connected WhatsApp instances.
 * Security Rules:
 * 1. Accepts ONLY valid Bearer INTERNAL_TOKEN or a globally verified super_admin profile.
 * 2. Rejects standard tenant owner/admin users with 403 Forbidden.
 * 3. Enforces APP_PUBLIC_URL in production.
 * 4. Implements rate limit cooldown (60s).
 * 5. Logs initiator identity without exposing secrets.
 */
export async function POST(request: NextRequest) {
  let initiator: string | null = null;
  const env = getEnv();

  // 1. Check Bearer token against INTERNAL_TOKEN
  const token = bearerToken(request);
  if (token && secretsMatch(token, env.INTERNAL_TOKEN)) {
    initiator = 'system_internal_token';
  }

  // 2. Check authenticated user for explicit super_admin role
  if (!initiator) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'super_admin') {
          initiator = `super_admin:${user.id}`;
        }
      }
    } catch {
      // Auth resolution failed
    }
  }

  // Reject unauthorized calls (including standard tenant owner/admin)
  if (!initiator) {
    return NextResponse.json(
      { error: 'Acceso no autorizado. Se requiere INTERNAL_TOKEN o rol super_admin.' },
      { status: 403 },
    );
  }

  // Enforce mandatory APP_PUBLIC_URL in production
  if (process.env.NODE_ENV === 'production' && !env.APP_PUBLIC_URL) {
    return NextResponse.json(
      { error: 'APP_PUBLIC_URL es obligatorio en producción para reconfigurar webhooks' },
      { status: 500 },
    );
  }

  // Rate-limiting cooldown check
  const now = Date.now();
  if (now - lastExecutionTime < COOLDOWN_MS) {
    const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastExecutionTime)) / 1000);
    return NextResponse.json(
      { error: `Operación en enfriamiento. Espera ${remainingSec}s antes de reintentar.` },
      { status: 429 },
    );
  }

  lastExecutionTime = now;

  const logger = createLogger({ operation: 'reconfigure_webhooks_admin_endpoint' });
  logger.info('Iniciando reconfiguración de webhooks para sesiones conectadas', { initiator });

  try {
    const appPublicUrl = env.APP_PUBLIC_URL ?? request.nextUrl.origin;
    const results = await reconfigureConnectedWebhooks(appPublicUrl);

    const totalCount = results.length;
    const successCount = results.filter((r) => r.success).length;

    logger.info('Reconfiguración de webhooks finalizada', {
      initiator,
      totalCount,
      successCount,
    });

    return NextResponse.json({
      message: `Reconfiguración completada. Exitosas: ${successCount}/${totalCount}`,
      initiator,
      results,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error al reconfigurar webhooks';
    logger.error('Error durante la reconfiguración de webhooks', { initiator, error: errorMsg });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
