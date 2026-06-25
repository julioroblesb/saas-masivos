import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// TODO: Reemplazar por el ID real cuando el usuario lo provea
const TEMPLATE_COMPANY_ID = '3c3cb849-06c8-4250-b4cf-9375422684a6';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Usar Service Role para bypass RLS al crear la empresa
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    console.log('[Demo] Iniciando clonación para usuario anónimo:', userId);

    // 1. Ejecutar RPC para clonar la plantilla
    const { data: cloneData, error: cloneError } = await supabaseAdmin.rpc('rpc_clone_demo_company', {
      p_template_company_id: TEMPLATE_COMPANY_ID
    });

    if (cloneError) throw cloneError;

    const newCompanyId = cloneData.new_company_id;

    // 2. Crear o actualizar el perfil del usuario anónimo para enlazarlo a la nueva empresa
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        company_id: newCompanyId,
        role: 'tenant',
        full_name: 'Invitado Demo'
      });

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, company_id: newCompanyId });

  } catch (error: any) {
    console.error('[Demo] Error al crear cuenta demo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
