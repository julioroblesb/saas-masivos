import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { z } from 'zod';

const TEMPLATE_COMPANY_ID = '3c3cb849-06c8-4250-b4cf-9375422684a6';
const cloneResultSchema = z.object({ new_company_id: z.string().uuid() });

export async function POST() {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.is_anonymous) {
      return NextResponse.json({ error: 'La demo requiere una sesión temporal' }, { status: 403 });
    }

    const userId = user.id;

    // Usar Service Role para bypass RLS al crear la empresa
    const supabaseAdmin = getSupabaseAdmin();

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id, companies!inner(is_demo)')
      .eq('id', userId)
      .eq('companies.is_demo', true)
      .maybeSingle();

    if (existingProfile?.company_id) {
      return NextResponse.json({ success: true, company_id: existingProfile.company_id });
    }

    // 1. Ejecutar RPC para clonar la plantilla
    const { data: cloneData, error: cloneError } = await supabaseAdmin.rpc(
      'rpc_clone_demo_company',
      {
        p_template_company_id: TEMPLATE_COMPANY_ID,
      },
    );

    if (cloneError) throw cloneError;

    const parsedClone = cloneResultSchema.safeParse(cloneData);
    if (!parsedClone.success) {
      return NextResponse.json({ error: 'No se pudo preparar el entorno demo' }, { status: 500 });
    }
    const newCompanyId = parsedClone.data.new_company_id;

    // 2. Crear o actualizar el perfil del usuario anónimo para enlazarlo a la nueva empresa
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      company_id: newCompanyId,
      role: 'owner',
      full_name: 'Invitado Demo',
    });

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, company_id: newCompanyId });
  } catch (error: unknown) {
    console.error('[Demo] Error al crear cuenta demo:', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'No se pudo preparar el entorno demo. Inténtalo nuevamente.' },
      { status: 500 },
    );
  }
}
