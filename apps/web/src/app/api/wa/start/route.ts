import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.company_id) {
      return NextResponse.json({ error: 'No se encontró la empresa del usuario' }, { status: 400 });
    }

    const WA_SERVICE_URL = process.env.WA_SERVICE_URL || 'http://localhost:4000';
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-secret-token';

    // Llamamos al microservicio en Render
    const response = await fetch(`${WA_SERVICE_URL}/internal/sessions/${profile.company_id}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INTERNAL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Error del motor WA:', await response.text());
      return NextResponse.json({ error: 'Error al comunicarse con el motor de WhatsApp' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error en /api/wa/start:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
