import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Get the user silvana@gmail.com
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) throw userError;
    
    const silvana = users.users.find(u => u.email === 'silvana@gmail.com');
    if (!silvana) {
      return NextResponse.json({ error: 'User silvana@gmail.com not found' }, { status: 404 });
    }
    
    // 2. Get the company_id from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', silvana.id)
      .single();
      
    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Company not found for user' }, { status: 404 });
    }
    
    const companyId = profile.company_id;
    
    // 3. Create a dummy contact for this company to attach the messages to
    const dummyContact = {
      company_id: companyId,
      name: 'Dummy Seed Contact',
      phone: '51999999999',
      tags: ['seed']
    };
    
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('crm_marketing_contacts')
      .insert(dummyContact)
      .select('id')
      .single();
      
    if (contactError) throw contactError;
    
    // 4. Insert dummy messages in crm_wa_queue
    const dummyMessages = [
      {
        company_id: companyId,
        contact_id: contact.id,
        phone: '51999999991',
        message: 'Mensaje cancelado de prueba 1 (origen: spa_visits)',
        status: 'cancelado',
        scheduled_for: new Date().toISOString()
      },
      {
        company_id: companyId,
        contact_id: contact.id,
        phone: '51999999992',
        message: 'Mensaje cancelado de prueba 2',
        status: 'cancelado',
        scheduled_for: new Date(Date.now() + 86400000).toISOString()
      },
      {
        company_id: companyId,
        contact_id: contact.id,
        phone: '51999999993',
        message: 'Mensaje fallido de prueba',
        status: 'fallido',
        scheduled_for: new Date().toISOString()
      },
      {
        company_id: companyId,
        contact_id: contact.id,
        phone: '51999999994',
        message: 'Mensaje pendiente de prueba',
        status: 'pendiente',
        scheduled_for: new Date(Date.now() + 86400000 * 2).toISOString()
      }
    ];
    
    const { error: insertError } = await supabaseAdmin
      .from('crm_wa_queue')
      .insert(dummyMessages);
      
    if (insertError) throw insertError;
    
    return NextResponse.json({ success: true, message: 'Seeded dummy messages successfully.' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
