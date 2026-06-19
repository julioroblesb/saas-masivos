import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // Obtener bb_project_id
    const { data: session } = await supabase
      .from('wa_sessions')
      .select('bb_project_id')
      .eq('company_id', profile.company_id)
      .single();

    const projectId = session?.bb_project_id;

    if (projectId) {
      const BB_API = process.env.BUILDERBOT_API_URL || 'https://app.builderbot.cloud/api/v1';
      const BB_KEY = process.env.BUILDERBOT_API_KEY;

      if (BB_KEY) {
        // Eliminar el proyecto de BuilderBot Cloud de forma permanente
        // Esto automáticamente elimina los deploys y libera la memoria en su nube
        const res = await fetch(`${BB_API}/manager/project/${projectId}`, {
          method: 'DELETE',
          headers: {
            'x-api-builderbot': BB_KEY
          }
        });
        
        if (!res.ok) {
          console.warn('Error al borrar proyecto en BuilderBot, pero continuaremos desvinculando localmente:', await res.text());
        }
      }
    }

    // Limpiar sesión local y resetear a desconectado
    await supabase.from('wa_sessions').update({
      bb_project_id: null,
      status: 'desconectado',
      phone_number: null,
      last_disconnect_reason: 'Desvinculado manualmente por el usuario',
      updated_at: new Date().toISOString()
    }).eq('company_id', profile.company_id);

    // Opcional: Pausar campañas que estaban 'running'? 
    // Por ahora lo dejamos igual.

    return NextResponse.json({ message: 'WhatsApp desvinculado' });
  } catch (error: any) {
    console.error('Error al desvincular WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
