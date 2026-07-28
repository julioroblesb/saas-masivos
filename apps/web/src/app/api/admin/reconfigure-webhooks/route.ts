import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/config/env';
import { bearerToken, secretsMatch } from '@/server/security/secrets';
import { reconfigureConnectedWebhooks } from '@/server/whatsapp/reconfigure-webhooks';
import { createClient } from '@/utils/supabase/server';

/**
 * Controlled internal/admin route to trigger webhook reconfiguration for all connected WhatsApp instances.
 * Security: Requires valid Bearer token matching INTERNAL_TOKEN or an authenticated owner/admin session.
 */
export async function POST(request: NextRequest) {
  let isAuthorized = false;

  // 1. Check Bearer token against INTERNAL_TOKEN
  const env = getEnv();
  const token = bearerToken(request);
  if (token && secretsMatch(token, env.INTERNAL_TOKEN)) {
    isAuthorized = true;
  }

  // 2. Fallback check: Authenticated owner user
  if (!isAuthorized) {
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
      if (profile?.role === 'owner' || profile?.role === 'admin') {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 });
  }

  try {
    const appPublicUrl = env.APP_PUBLIC_URL ?? request.nextUrl.origin;
    const results = await reconfigureConnectedWebhooks(appPublicUrl);

    const totalCount = results.length;
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Reconfiguración completada. Exitosas: ${successCount}/${totalCount}`,
      results,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al reconfigurar webhooks',
      },
      { status: 500 },
    );
  }
}
