import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  evolution,
  EVOLUTION_COMPATIBLE_VERSION,
  EvolutionApiError,
} from '@/integrations/evolution/client';
import { getEnv } from '@/config/env';
import { TenantAccessService } from '@/server/access/tenant-access-service';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, companies(name, status, subscription_end_at)')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const access = await TenantAccessService.allows('owner');
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Acceso bloqueado por suscripción.', code: access.state },
        { status: 403 },
      );
    }

    const { data: session } = await supabase
      .from('wa_sessions')
      .select('*')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    const cleanCompanyId = profile.company_id.replaceAll('-', '');
    const instanceName = session?.bb_project_id || `company_${cleanCompanyId}`;

    const env = getEnv();
    const appPublicUrl = env.APP_PUBLIC_URL ?? request.nextUrl.origin;
    const webhookUrl = `${appPublicUrl.replace(/\/$/, '')}/api/wa/webhook`;

    let qr = null;
    try {
      const createData = await evolution.createInstance(instanceName);
      qr = createData.qrCode;
    } catch (createErr: unknown) {
      if (createErr instanceof EvolutionApiError && createErr.status !== 409) {
        throw createErr;
      }
    }

    await evolution.configureWebhook(
      instanceName,
      webhookUrl,
      env.INTERNAL_TOKEN,
      profile.company_id,
    );

    const supabaseAdmin = getSupabaseAdmin();

    // Resetear connection_started_at a null durante la provisión/generación
    const initialStatus = qr ? 'esperando_qr' : 'generando_qr';

    const { error: sessionError } = await supabaseAdmin.from('wa_sessions').upsert({
      company_id: profile.company_id,
      bb_project_id: instanceName,
      status: initialStatus,
      connection_started_at: null,
      updated_at: new Date().toISOString(),
    });

    if (sessionError) {
      throw new Error(`No se pudo persistir la sesión: ${sessionError.message}`);
    }

    return NextResponse.json({
      message: `Instancia inicializada en Evolution API ${EVOLUTION_COMPATIBLE_VERSION}`,
      instanceName,
      status: initialStatus,
      code: qr ? 'QR_READY' : 'QR_NOT_READY',
      qr,
    });
  } catch (error: unknown) {
    console.error('Error al iniciar instancia en Evolution API:', {
      message: error instanceof Error ? error.message : String(error),
    });
    const isProviderError = error instanceof EvolutionApiError;
    return NextResponse.json(
      {
        error: isProviderError
          ? error.message
          : 'No se pudo iniciar la conexión de WhatsApp. Inténtalo nuevamente.',
        code: isProviderError ? error.code : 'INSTANCE_INIT_FAILED',
      },
      { status: isProviderError && error.status ? error.status : 500 },
    );
  }
}
