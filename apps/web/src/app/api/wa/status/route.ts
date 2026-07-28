import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { evolution } from '@/integrations/evolution/client';
import { TenantAccessService } from '@/server/access/tenant-access-service';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

export async function GET() {
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
      .select('company_id, companies(status, subscription_end_at)')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const access = await TenantAccessService.forCurrentUser();
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Acceso bloqueado por suscripción.', code: access.state },
        { status: 403 },
      );
    }

    const { data: session } = await supabase
      .from('wa_sessions')
      .select('evolution_instance_name, status, connection_started_at')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    const instanceName = session?.evolution_instance_name;

    if (!session || !instanceName) {
      return NextResponse.json({
        status: 'desconectado',
        evo_state: 'close',
        is_demo: access.state === 'demo',
        qr: null,
      });
    }

    let evoState = 'close';
    let qr: string | null = null;

    try {
      const statusData = await evolution.getConnectionState(instanceName);
      evoState = statusData.state;
    } catch (err) {
      console.error('Evolution connectionState fetch failed', {
        instanceName,
        message: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        {
          status: 'error',
          code: 'EVOLUTION_STATE_FETCH_FAILED',
          qr: null,
        },
        { status: 502 },
      );
    }

    // Intentar obtener QR si no está completamente abierto
    if (evoState !== 'open') {
      try {
        const qrData = await evolution.getQrCode(instanceName);
        qr = qrData.qrCode;
      } catch (err) {
        console.error('Evolution QR fetch failed', {
          instanceName,
          message: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
          {
            status: 'error',
            code: 'QR_FETCH_FAILED',
            qr: null,
          },
          { status: 502 },
        );
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

    const supabaseAdmin = getSupabaseAdmin();

    const updateData: {
      status: string;
      updated_at: string;
      connection_started_at?: string | null;
    } = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
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
      code:
        dbStatus === 'generando_qr'
          ? 'QR_NOT_READY'
          : dbStatus === 'esperando_qr'
            ? 'QR_READY'
            : 'OK',
      is_demo: access.state === 'demo',
      qr,
    });
  } catch (error: unknown) {
    console.error('Error in status GET endpoint:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}
