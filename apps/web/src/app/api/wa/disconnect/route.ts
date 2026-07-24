import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { evolution } from '@/integrations/evolution/client';

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

    const { data: session } = await supabase
      .from('wa_sessions')
      .select('bb_project_id')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    const instanceName = session?.bb_project_id;

    if (instanceName) {
      try {
        await evolution.logoutInstance(instanceName);
        await evolution.deleteInstance(instanceName);
      } catch (e: any) {
        console.warn('Advertencia al eliminar instancia en Evolution API:', e.message);
      }
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    await supabaseAdmin.from('wa_sessions').update({
      bb_project_id: null,
      status: 'desconectado',
      phone_number: null,
      connection_started_at: null,
      last_disconnect_reason: 'Desvinculado manualmente por el usuario',
      updated_at: new Date().toISOString()
    }).eq('company_id', profile.company_id);

    return NextResponse.json({ message: 'WhatsApp desvinculado' });
  } catch (error: any) {
    console.error('Error al desvincular WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Error al desvincular' }, { status: 500 });
  }
}
