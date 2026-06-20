import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const { data: session } = await supabase
      .from('wa_sessions')
      .select('bb_project_id, status, bb_host')
      .eq('company_id', profile.company_id)
      .single();

    if (!session || !session.bb_project_id) {
      return NextResponse.json({ status: 'desconectado' });
    }

    const projectId = session.bb_project_id;
    const BB_API = process.env.BUILDERBOT_API_URL || 'https://app.builderbot.cloud/api/v1';
    const BB_KEY = process.env.BUILDERBOT_API_KEY;

    // Consultar el status real en BuilderBot Cloud
    const statusRes = await fetch(`${BB_API}/manager/deploys/${projectId}/status`, {
      headers: { 'x-api-builderbot': BB_KEY! }
    });
    
    if (!statusRes.ok) {
      return NextResponse.json({ status: session.status });
    }

    const statusData = await statusRes.json();
    const bbStatus = statusData.status; // ONLINE, OFFLINE, INITIALIZATION, READY_TO_SCAN, FAILED

    let dbStatus = session.status;
    let qr = null;

    if (bbStatus === 'READY_TO_SCAN') {
      dbStatus = 'esperando_qr';
      // Obtener el QR
      const qrRes = await fetch(`${BB_API}/manager/deploys/${projectId}/qr`, {
        headers: { 'x-api-builderbot': BB_KEY! }
      });
      if (qrRes.ok) {
        // Asumiendo que la API devuelve una imagen directa o un JSON con el QR en base64
        const contentType = qrRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
           const qrData = await qrRes.json();
           qr = qrData.qr || qrData.url;
        } else {
           // Si devuelve la imagen binaria, la convertimos a base64
           const buffer = await qrRes.arrayBuffer();
           const base64 = Buffer.from(buffer).toString('base64');
           qr = `data:${contentType};base64,${base64}`;
        }
      }
    } else if (bbStatus === 'ONLINE') {
      dbStatus = 'conectado';
    } else if (bbStatus === 'FAILED' || bbStatus === 'OFFLINE') {
      dbStatus = 'error';
    } else {
      dbStatus = 'conectando'; // INITIALIZATION u otros
    }

    // Actualizar BD si cambió
    if (dbStatus !== session.status) {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      await supabaseAdmin.from('wa_sessions').update({ 
        status: dbStatus,
        updated_at: new Date().toISOString()
      }).eq('company_id', profile.company_id);
    }

    return NextResponse.json({ 
      status: dbStatus,
      bb_status: bbStatus,
      qr 
    });

  } catch (error: any) {
    console.error('Error fetching BuilderBot status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
