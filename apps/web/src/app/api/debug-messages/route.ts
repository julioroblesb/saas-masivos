import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', profile.company_id)
      .single();

    if (compErr) {
      return NextResponse.json({ error: compErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: user.id,
      company_id: profile.company_id,
      settings: company?.settings,
      message: "Por favor envíale esto a Antigravity"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
