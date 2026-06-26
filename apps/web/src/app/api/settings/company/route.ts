import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return NextResponse.json({ error: 'No empresa' }, { status: 400 });

    const { data: company } = await supabase.from('companies').select('settings').eq('id', profile.company_id).single();
    return NextResponse.json({ settings: company?.settings || {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { companyName, settings } = await req.json();

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada para este usuario' }, { status: 400 });
    }

    const companyId = profile.company_id;

    // 1. Obtener la compañía actual para no sobreescribir settings
    const { data: currentCompany } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    // 2. Actualizar en la base de datos local usando SERVICE ROLE
    const updateData: any = { };
    if (companyName) {
      updateData.name = companyName.trim();
    }
    
    // Si se enviaron configuraciones, las unimos con las existentes
    if (settings) {
      updateData.settings = { ...(currentCompany?.settings || {}), ...settings };
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('id', companyId);

    if (updateError) {
      throw updateError;
    }

    // 2. Sincronizar con BuilderBot si tiene una sesión
    const { data: session } = await supabase
      .from('wa_sessions')
      .select('bb_project_id')
      .eq('company_id', companyId)
      .single();

    if (session?.bb_project_id) {
      const BB_API = process.env.BUILDERBOT_API_URL || 'https://app.builderbot.cloud/api/v1';
      const BB_KEY = process.env.BUILDERBOT_API_KEY;

      if (BB_KEY) {
        await fetch(`${BB_API}/manager/project/${session.bb_project_id}`, {
          method: 'PUT',
          headers: {
            'x-api-builderbot': BB_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: companyName.trim() })
        });
      }
    }

    return NextResponse.json({ message: 'Empresa actualizada correctamente' });
  } catch (error: any) {
    console.error('Error guardando configuración:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
