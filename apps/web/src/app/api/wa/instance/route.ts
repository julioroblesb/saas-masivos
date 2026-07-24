import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
    const companyName = company?.name || `Client-${profile.company_id.substring(0,8)}`;

    // VERIFICACIÓN DE SUSCRIPCIÓN
    if (company?.status !== 'activa') {
      return NextResponse.json({ error: 'Cuenta suspendida o inactiva. Contacte a soporte.' }, { status: 403 });
    }
    if (company?.subscription_end_at && new Date(company.subscription_end_at) < new Date()) {
      return NextResponse.json({ error: 'Suscripción vencida. Renueve su plan para continuar usando el servicio.' }, { status: 403 });
    }

    // 1. Obtener la sesión actual para recuperar el ID de la instancia
    let { data: session } = await supabase
      .from('wa_sessions')
      .select('*')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    // Nombre de instancia inmutable usando el UUID completo sin guiones para evitar colisiones
    const cleanCompanyId = profile.company_id.replaceAll('-', '');
    const instanceName = session?.bb_project_id || `company_${cleanCompanyId}`;
    const EVO_API = process.env.EVOLUTION_API_URL || 'http://100.72.75.79:8080';
    const EVO_KEY = process.env.EVOLUTION_API_KEY || 'masivos_evolution_secret_key_2026';
    const webhookSecret = process.env.INTERNAL_TOKEN || 'masivos_webhook_secret_2026';

    const evoHeaders: Record<string, string> = {
      'apikey': EVO_KEY,
      'Content-Type': 'application/json'
    };
    if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
      evoHeaders['CF-Access-Client-Id'] = process.env.CF_ACCESS_CLIENT_ID;
      evoHeaders['CF-Access-Client-Secret'] = process.env.CF_ACCESS_CLIENT_SECRET;
    }

    const protocol = req.headers.get('x-forwarded-proto') || (req.headers.get('host')?.includes('localhost') ? 'http' : 'https');
    const host = req.headers.get('host');
    const webhookUrl = `${protocol}://${host}/api/wa/webhook`;

    // Guardar o actualizar la sesión en Supabase
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await supabaseAdmin.from('wa_sessions').upsert({
      company_id: profile.company_id,
      bb_project_id: instanceName,
      status: 'conectando',
      updated_at: new Date().toISOString()
    });

    const webhookConfig = {
      enabled: true,
      url: webhookUrl,
      byEvents: false,
      base64: true,
      headers: {
        'X-Evolution-Webhook-Secret': webhookSecret,
        'X-Company-ID': profile.company_id
      },
      events: [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED'
      ]
    };

    // 2. Crear instancia en Evolution API v2.2.3 con syncFullHistory: false
    const createRes = await fetch(`${EVO_API}/instance/create`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        syncFullHistory: false
      })
    });

    let qr = null;
    if (createRes.ok) {
      const createData = await createRes.json();
      qr = createData.qrcode?.base64 || null;
    }

    // Configurar o actualizar el webhook en endpoint dedicado /webhook/set/{instanceName}
    await fetch(`${EVO_API}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify(webhookConfig)
    });

    return NextResponse.json({ 
      message: 'Instancia inicializada en Evolution API', 
      instanceName,
      status: 'conectando',
      qr
    });
  } catch (error: any) {
    console.error('Error al iniciar instancia en Evolution API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

