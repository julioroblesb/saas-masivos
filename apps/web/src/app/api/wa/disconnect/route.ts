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
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Obtener la instancia de Evolution API
    const { data: session } = await supabase
      .from('wa_sessions')
      .select('bb_project_id')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    const instanceName = session?.bb_project_id;

    if (instanceName) {
      const EVO_API = process.env.EVOLUTION_API_URL || 'http://100.72.75.79:8080';
      const EVO_KEY = process.env.EVOLUTION_API_KEY || 'masivos_evolution_secret_key_2026';

      const evoHeaders: Record<string, string> = { 'apikey': EVO_KEY };
      if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
        evoHeaders['CF-Access-Client-Id'] = process.env.CF_ACCESS_CLIENT_ID;
        evoHeaders['CF-Access-Client-Secret'] = process.env.CF_ACCESS_CLIENT_SECRET;
      }

      try {
        // Logout y Delete en Evolution API
        await fetch(`${EVO_API}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: evoHeaders
        });
        await fetch(`${EVO_API}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: evoHeaders
        });
      } catch (e) {
        console.warn('Error al eliminar instancia en Evolution API:', e);
      }
    }

    // Limpiar sesión local y resetear a desconectado
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await supabaseAdmin.from('wa_sessions').update({
      bb_project_id: null,
      status: 'desconectado',
      phone_number: null,
      last_disconnect_reason: 'Desvinculado manualmente por el usuario',
      updated_at: new Date().toISOString()
    }).eq('company_id', profile.company_id);

    return NextResponse.json({ message: 'WhatsApp desvinculado' });
  } catch (error: any) {
    console.error('Error al desvincular WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

