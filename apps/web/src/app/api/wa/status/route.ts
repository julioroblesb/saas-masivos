import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { evolution } from '@/integrations/evolution/client';

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

    // @ts-ignore
    const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;
    
    if (company?.status !== 'activa') {
      return NextResponse.json({ error: 'Cuenta suspendida o inactiva.' }, { status: 403 });
    }
    if (company?.subscription_end_at && new Date(company.subscription_end_at) < new Date()) {
      return NextResponse.json({ error: 'Suscripción vencida.' }, { status: 403 });
    }

    const { data: session } = await supabase
      .from('wa_sessions')
      .select('bb_project_id, status, connection_started_at')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (!session || !session.bb_project_id) {
      return NextResponse.json({ status: 'desconectado' });
    }

    const instanceName = session.bb_project_id;
    let dbStatus = session.status;
    let qr = null;
    let evoState = 'close';

    try {
      const statusData = await evolution.getConnectionState(instanceName);
      evoState = statusData?.instance?.state || 'close';

      if (evoState === 'open') {
        dbStatus = 'conectado';
      } else if (evoState === 'connecting') {
        dbStatus = 'esperando_qr';
      } else {
        dbStatus = 'desconectado';
      }
    } catch (err) {
      dbStatus = 'desconectado';
    }

    // Si está conectando o esperando QR, intentar obtener el QR en base64
    if (evoState === 'connecting' || evoState === 'close' || dbStatus === 'esperando_qr') {
      try {
        const qrData = await evolution.getQr(instanceName);
        qr = qrData?.base64 || qrData?.code || qrData?.qr || null;
        if (qr) {
          dbStatus = 'esperando_qr';
        }
      } catch (qrErr) {}
    }

    // Actualizar BD si cambió de estado, o si está conectado pero no tiene connection_started_at
    const needsStartedAtUpdate = (dbStatus === 'conectado' && !session.connection_started_at);

    if (dbStatus !== session.status || needsStartedAtUpdate) {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      
      const updateData: any = {
        status: dbStatus,
        updated_at: new Date().toISOString()
      };

      if (needsStartedAtUpdate) {
        updateData.connection_started_at = new Date().toISOString();
      }

      await supabaseAdmin.from('wa_sessions').update(updateData).eq('company_id', profile.company_id);
    }

    return NextResponse.json({ 
      status: dbStatus,
      evo_state: evoState,
      qr 
    });

  } catch (error: any) {
    console.error('Error fetching Evolution API status:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener estado' }, { status: 500 });
  }
}
