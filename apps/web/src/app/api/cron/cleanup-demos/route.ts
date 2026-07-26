export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { bearerToken, secretsMatch } from '@/server/security/secrets';

export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();

  const CRON_SECRET = process.env.CRON_SECRET;

  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado en servidor' }, { status: 500 });
  }

  if (!secretsMatch(bearerToken(req), CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Ejecutando basurero de demos efímeros...');

  try {
    const { data, error } = await supabaseAdmin.rpc('rpc_cleanup_demo_companies');

    if (error) {
      throw error;
    }

    const { error: webhookCleanupError } = await supabaseAdmin
      .from('wa_webhook_events')
      .delete()
      .lt('expires_at', new Date().toISOString());
    if (webhookCleanupError) {
      throw webhookCleanupError;
    }

    return NextResponse.json({
      success: true,
      message: 'Limpieza completada',
      details: data,
    });
  } catch (globalError: unknown) {
    console.error('Error fatal en cron de limpieza:', globalError);
    return NextResponse.json(
      {
        error: globalError instanceof Error ? globalError.message : 'Error interno de limpieza',
      },
      { status: 500 },
    );
  }
}
