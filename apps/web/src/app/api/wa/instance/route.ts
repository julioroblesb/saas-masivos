import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { evolution } from '@/integrations/evolution/client';
import { getEnv } from '@/config/env';

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

    // VERIFICACIÓN DE SUSCRIPCIÓN
    if (company?.status !== 'activa') {
      return NextResponse.json({ error: 'Cuenta suspendida o inactiva. Contacte a soporte.' }, { status: 403 });
    }
    if (company?.subscription_end_at && new Date(company.subscription_end_at) < new Date()) {
      return NextResponse.json({ error: 'Suscripción vencida. Renueve su plan para continuar usando el servicio.' }, { status: 403 });
    }

    // 1. Obtener la sesión actual para recuperar el ID de la instancia
    const { data: session } = await supabase
      .from('wa_sessions')
      .select('*')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    // Nombre de instancia inmutable usando el UUID completo sin guiones para evitar colisiones
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
      // Si la instancia ya existía, continuamos
    }

    // Configurar webhook mediante el wrapper correcto { webhook: ... }
    await evolution.setWebhook(instanceName, webhookUrl, env.INTERNAL_TOKEN, profile.company_id);

    // Solo al confirmar éxito en Evolution, actualizamos/guardamos en Supabase
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
