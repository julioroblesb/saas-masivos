import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { companyName, companyId } = await req.json();

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // 1. Actualizar en la base de datos local
    const { error: updateError } = await supabase
      .from('companies')
      .update({ name: companyName.trim() })
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
