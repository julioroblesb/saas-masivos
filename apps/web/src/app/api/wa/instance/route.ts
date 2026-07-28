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

type ProvisionStep =
  | 'authenticate'
  | 'resolve_tenant'
  | 'create_instance'
  | 'verify_existing_instance'
  | 'persist_session'
  | 'configure_webhook'
  | 'fetch_qr';

interface EnsureResult {
  qr: string | null;
  createdNew: boolean;
  existedAlready: boolean;
}

interface InstanceResponse {
  message: string;
  instanceName: string;
  status: string;
  code: string;
  qr: string | null;
  webhookConfigured: boolean;
  warningCode?: string;
  warning?: string;
}

/**
 * Idempotent instance provisioning.
 * 1. Try createInstance.
 * 2. If 409 / INSTANCE_ALREADY_EXISTS / CONFLICT → instance exists, fetch QR.
 * 3. If 401/403 → try reading the instance instead of assuming invalid credentials.
 * 4. If read works → instance confirmed.
 * 5. If both create and read fail with auth → genuine configuration error.
 */
async function ensureEvolutionInstance(instanceName: string): Promise<EnsureResult> {
  try {
    const createData = await evolution.createInstance(instanceName);
    return { qr: createData.qrCode, createdNew: true, existedAlready: false };
  } catch (createErr: unknown) {
    if (!(createErr instanceof EvolutionApiError)) throw createErr;

    const isConflict =
      createErr.status === 409 ||
      createErr.code === 'CONFLICT' ||
      createErr.code === 'INSTANCE_ALREADY_EXISTS';

    const isForbidden =
      createErr.status === 401 ||
      createErr.status === 403 ||
      createErr.code === 'PROVIDER_FORBIDDEN' ||
      createErr.code === 'CLOUDFLARE_ACCESS_REJECTED';

    if (!isConflict && !isForbidden) throw createErr;

    // Instance may already exist — try to read it
    try {
      const state = await evolution.getConnectionState(instanceName);
      let qr: string | null = null;
      if (state.state !== 'open') {
        const qrData = await evolution.getQrCode(instanceName);
        qr = qrData.qrCode;
      }
      console.info('WhatsApp instance confirmed via fallback read', {
        instanceName,
        createErrorCode: createErr.code,
        connectionState: state.state,
      });
      return { qr, createdNew: false, existedAlready: true };
    } catch (readErr: unknown) {
      // Both create and read failed — genuine auth/config error
      if (readErr instanceof EvolutionApiError) {
        throw new EvolutionApiError(
          'No se pudo crear ni verificar la instancia. Revise la configuración de Evolution API.',
          'PROVIDER_AUTH_REJECTED',
          readErr.status,
        );
      }
      throw createErr;
    }
  }
}

export async function POST(request: NextRequest) {
  let currentStep: ProvisionStep = 'authenticate';
  let companyId: string | undefined;
  let instanceName = '';

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    currentStep = 'resolve_tenant';
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, companies(name, status, subscription_end_at)')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const resolvedCompanyId = profile.company_id;
    companyId = resolvedCompanyId;

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
      .eq('company_id', resolvedCompanyId)
      .maybeSingle();

    const cleanCompanyId = resolvedCompanyId.replaceAll('-', '');
    instanceName = session?.bb_project_id || `company_${cleanCompanyId}`;

    const env = getEnv();
    if (process.env.NODE_ENV === 'production' && !env.APP_PUBLIC_URL) {
      throw new Error('APP_PUBLIC_URL es obligatorio en producción para configurar webhooks de forma segura');
    }

    const appPublicUrl = env.APP_PUBLIC_URL ?? request.nextUrl.origin;
    const webhookUrl = `${appPublicUrl.replace(/\/$/, '')}/api/wa/webhook`;

    // --- Step: Create or confirm instance ---
    currentStep = 'create_instance';
    const result = await ensureEvolutionInstance(instanceName);

    // --- Step: Persist session BEFORE webhook ---
    currentStep = 'persist_session';
    const supabaseAdmin = getSupabaseAdmin();
    const initialStatus = result.qr ? 'esperando_qr' : 'generando_qr';

    const { error: sessionError } = await supabaseAdmin.from('wa_sessions').upsert({
      company_id: resolvedCompanyId,
      bb_project_id: instanceName,
      status: initialStatus,
      connection_started_at: null,
      updated_at: new Date().toISOString(),
    });

    if (sessionError) {
      throw new Error(`No se pudo persistir la sesión: ${sessionError.message}`);
    }

    // --- Step: Configure webhook (non-blocking) ---
    currentStep = 'configure_webhook';

    let webhookConfigured = true;
    let warningCode: string | undefined;
    let warning: string | undefined;

    try {
      await evolution.configureWebhook(
        instanceName,
        webhookUrl,
        env.INTERNAL_TOKEN,
        resolvedCompanyId,
      );
    } catch (webhookErr: unknown) {
      webhookConfigured = false;
      warningCode = 'WEBHOOK_CONFIGURATION_FAILED';
      warning = 'El QR está disponible, pero no se pudo configurar el webhook de eventos.';
      console.warn('Webhook configuration failed (non-blocking)', {
        step: currentStep,
        companyId,
        instanceName,
        code: webhookErr instanceof EvolutionApiError ? webhookErr.code : undefined,
        status: webhookErr instanceof EvolutionApiError ? webhookErr.status : undefined,
        message: webhookErr instanceof Error ? webhookErr.message : String(webhookErr),
      });
    }

    const response: InstanceResponse = {
      message: `Instancia inicializada en Evolution API ${EVOLUTION_COMPATIBLE_VERSION}`,
      instanceName,
      status: initialStatus,
      code: result.qr ? 'QR_READY' : 'QR_NOT_READY',
      qr: result.qr,
      webhookConfigured,
      ...(warningCode ? { warningCode, warning } : {}),
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('WhatsApp provisioning failed', {
      step: currentStep,
      companyId,
      instanceName,
      code: error instanceof EvolutionApiError ? error.code : undefined,
      status: error instanceof EvolutionApiError ? error.status : undefined,
      message: error instanceof Error ? error.message : String(error),
    });

    const isProviderError = error instanceof EvolutionApiError;
    return NextResponse.json(
      {
        error: isProviderError
          ? error.message
          : 'No se pudo iniciar la conexión de WhatsApp. Inténtalo nuevamente.',
        code: isProviderError ? error.code : 'INSTANCE_INIT_FAILED',
        step: currentStep,
      },
      { status: isProviderError && error.status ? error.status : 500 },
    );
  }
}
