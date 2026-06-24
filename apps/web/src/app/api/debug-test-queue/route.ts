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

    // Hypothesis 1: Check Settings
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', profile.company_id)
      .single();

    // Hypothesis 2: Test RLS Policy on crm_wa_queue
    const fakeInsert = {
      company_id: profile.company_id,
      visit_id: null,
      contact_id: null,
      phone: '+1234567890',
      message: 'Test Message from Debugger',
      status: 'cancelado', // Use cancelado so it doesn't actually send
      scheduled_for: new Date().toISOString()
    };

    const { error: insertErr } = await supabase
      .from('crm_wa_queue')
      .insert([fakeInsert]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      company_id: profile.company_id,
      hypothesis_1_settings: {
        auto_messages: company?.settings?.auto_messages || "NO DEFINIDO",
        error: compErr?.message || null
      },
      hypothesis_2_rls_insert: {
        success: !insertErr,
        error: insertErr?.message || null,
        code: insertErr?.code || null,
        details: insertErr?.details || null
      },
      message: "Por favor copia todo este JSON y envíamelo!"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
