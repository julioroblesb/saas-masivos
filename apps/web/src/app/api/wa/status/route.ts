import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { evolution, extractEvolutionQr } from '@/integrations/evolution/client';
import { evaluateTenantAccess } from '@/domain/subscriptions/evaluate-tenant-access';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, companies(status, subscription_end_at)')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;
    
    const access = evaluateTenantAccess(company);
    if (!access.allowed) {
      const messages = {
        expired: 'Suscripción vencida.',
        suspended: 'Cuenta suspendida.',
        cancelled: 'Cuenta cancelada.',
        subscription_not_configured: 'Suscripción no configurada.',
        invalid_status: 'Estado administrativo inválido.',
      } as const;

      return NextResponse.json({ 
        error: messages[access.reason as keyof typeof messages] || 'Acceso bloqueado por suscripción.',
        code: access.reason
      }, { status: 403 });
    }

    const { data: session } = await supabase
      .from('wa_sessions')
      .select('bb_project_id, status, connection_started_at')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (!session || !session.bb_project_id) {
      return NextResponse.json({ status: 'desconectado', evo_state: 'close', qr: null });
    }

    const instanceName = session.bb_project_id;
    let evoState = 'close';
    let qr: string | null = null;

    try {
      const statusData = await evolution.getConnectionState(instanceName);
      evoState = statusData?.instance?.state || 'close';
    } catch (err) {
      console.error('Evolution connectionState fetch failed', {
        instanceName,
        message: err instanceof Error ? err.message : String(err)
      });
      return NextResponse.json({
        status: 'error',
        code: 'EVOLUTION_STATE_FETCH_FAILED',
        qr: null
      }, { status: 502 });
    }

    // Intentar obtener QR si no está completamente abierto
    if (evoState !== 'open') {
      try {
        const qrData = await evolution.getQr(instanceName);
        qr = extractEvolutionQr(qrData);
      } catch (err) {
        console.error('Evolution QR fetch failed', {
          instanceName,
          message: err instanceof Error ? err.message : String(err)
        });
        return NextResponse.json({
          status: 'error',
          code: 'QR_FETCH_FAILED',
          qr: null
        }, { status: 502 });
      }
    }

    let dbStatus = 'desconectado';
    if (evoState === 'open') {
      dbStatus = 'conectado';
    } else if (evoState === 'connecting' && qr) {
      dbStatus = 'esperando_qr';
    } else if (evoState === 'connecting') {
      dbStatus = 'generando_qr';
    } else {
      dbStatus = 'desconectado';
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const updateData: any = {
      status: dbStatus,
      updated_at: new Date().toISOString()
    };

    if (dbStatus === 'conectado') {
      if (!session.connection_started_at) {
        updateData.connection_started_at = new Date().toISOString();
      }
    } else {
      updateData.connection_started_at = null;
    }

    await supabaseAdmin.from('wa_sessions').update(updateData).eq('company_id', profile.company_id);

    return NextResponse.json({ 
      status: dbStatus,
      evo_state: evoState,
      code: dbStatus === 'generando_qr' ? 'QR_NOT_READY' : dbStatus === 'esperando_qr' ? 'QR_READY' : 'OK',
      qr 
    });

  } catch (error: any) {
    console.error('Error in status GET endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error interno', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
