import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { evolution, EvolutionApiError } from '@/integrations/evolution/client';
import { getEnv } from '@/config/env';
import { evaluateTenantAccess } from '@/domain/subscriptions/evaluate-tenant-access';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    // @ts-ignore
    const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;

    // EVALUACIÓN DE ACCESO EFECTIVO
    const access = evaluateTenantAccess(company);
    if (!access.allowed) {
      const messages = {
        expired: 'Suscripción vencida. Renueve su plan para continuar.',
        suspended: 'Cuenta suspendida. Contacte a soporte.',
        cancelled: 'Cuenta cancelada.',
        subscription_not_configured: 'La suscripción no ha sido configurada.',
        invalid_status: 'La cuenta tiene un estado administrativo inválido.',
      } as const;

      return NextResponse.json({
        error: messages[access.reason as keyof typeof messages] || 'Acceso bloqueado por suscripción.',
        code: access.reason
      }, { status: 403 });
    }

    const { data: session } = await supabase
      .from('wa_sessions')
      .select('*')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    const cleanCompanyId = profile.company_id.replaceAll('-', '');
    const instanceName = session?.bb_project_id || `company_${cleanCompanyId}`;

    const protocol = req.headers.get('x-forwarded-proto') || (req.headers.get('host')?.includes('localhost') ? 'http' : 'https');
    const host = req.headers.get('host');
    const webhookUrl = `${protocol}://${host}/api/wa/webhook`;
    const env = getEnv();

    let qr = null;
    try {
      const createData = await evolution.createInstance(instanceName);
      qr = createData?.qrcode?.base64 || null;
    } catch (createErr: any) {
      // Ignorar únicamente si es conflicto 409 (la instancia ya existe en Evolution API)
      if (createErr instanceof EvolutionApiError && createErr.status !== 409) {
        throw createErr;
      }
    }

    await evolution.setWebhook(instanceName, webhookUrl, env.INTERNAL_TOKEN, profile.company_id);

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    const { error: sessionError } = await supabaseAdmin.from('wa_sessions').upsert({
      company_id: profile.company_id,
      bb_project_id: instanceName,
      status: 'conectando',
      updated_at: new Date().toISOString()
    });

    if (sessionError) {
      throw new Error(`No se pudo persistir la sesión: ${sessionError.message}`);
    }

    return NextResponse.json({ 
      message: 'Instancia inicializada en Evolution API v2.2.3', 
      instanceName,
      status: 'conectando',
      qr
    });
  } catch (error: any) {
    console.error('Error al iniciar instancia en Evolution API:', error);
    return NextResponse.json({ error: error.message || 'Error al iniciar instancia' }, { status: 500 });
  }
}
