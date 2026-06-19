import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
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

    // 1. Obtener la sesión actual para ver si ya tiene un proyecto de BuilderBot
    let { data: session } = await supabase
      .from('wa_sessions')
      .select('*')
      .eq('company_id', profile.company_id)
      .single();

    let projectId = session?.bb_project_id;
    const BB_API = process.env.BUILDERBOT_API_URL || 'https://app.builderbot.cloud/api/v1';
    const BB_KEY = process.env.BUILDERBOT_API_KEY;

    if (!BB_KEY) throw new Error('API Key de BuilderBot no configurada');

    if (!projectId) {
      // 2. Crear proyecto en BuilderBot
      const createProjRes = await fetch(`${BB_API}/manager/project`, {
        method: 'POST',
        headers: {
          'x-api-builderbot': BB_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: `Client-${profile.company_id.substring(0,8)}`, shareable: false })
      });
      if (!createProjRes.ok) throw new Error('Error creando proyecto en BuilderBot');
      const projData = await createProjRes.json();
      projectId = projData.project.uuid;

      // Guardar el bb_project_id en wa_sessions
      await supabase.from('wa_sessions').upsert({
        company_id: profile.company_id,
        bb_project_id: projectId,
        status: 'conectando',
        updated_at: new Date().toISOString()
      });

      // 2.5 Configurar el proyecto (Motor Baileys y API Key para que el cron pueda enviarle POSTs)
      await fetch(`${BB_API}/manager/project/${projectId}/settings`, {
        method: 'PUT',
        headers: {
          'x-api-builderbot': BB_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          provider: 'baileys',
          apiKey: BB_KEY, // Usamos la misma global key para no enredarnos
          showRecordingEvents: false,
          showTypingEvents: false
        })
      });

      // 3. Iniciar el Deploy
      const deployRes = await fetch(`${BB_API}/manager/deploys`, {
        method: 'POST',
        headers: {
          'x-api-builderbot': BB_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });
      if (!deployRes.ok && deployRes.status !== 409) {
        // 409 significa que ya existe un deploy en curso, lo ignoramos
        throw new Error('Error iniciando deploy en BuilderBot');
      }
    } else {
      // Si ya existía, intentar reiniciarlo por si estaba caído
      await fetch(`${BB_API}/manager/deploys/${projectId}/reboot`, {
        method: 'POST',
        headers: { 'x-api-builderbot': BB_KEY }
      });
    }

    return NextResponse.json({ 
      message: 'Instancia inicializada en BuilderBot', 
      projectId,
      status: 'conectando' 
    });
  } catch (error: any) {
    console.error('Error al iniciar instancia en BuilderBot:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
