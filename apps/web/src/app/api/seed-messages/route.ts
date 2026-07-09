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
    
    // 3. Create 20 dummy contacts for this company
    const dummyContacts = Array.from({ length: 20 }).map((_, i) => ({
      company_id: companyId,
      name: `Cliente Demo ${i + 1}`,
      phone: `519${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      tags: ['seed']
    }));
    
    const { data: contacts, error: contactError } = await supabaseAdmin
      .from('crm_marketing_contacts')
      .insert(dummyContacts)
      .select('id, name, phone');
      
    if (contactError || !contacts) throw contactError;
    
    // 4. Insert dummy messages in crm_wa_queue
    const dummyMessages = contacts.map((contact, i) => {
      const isAgradecimiento = i % 2 === 0;
      const servicio = isAgradecimiento ? 'Corte de Cabello' : 'Manicura';
      const dias = 3;
      
      const message = isAgradecimiento
        ? `Hola ${contact.name}! Gracias por visitarnos hoy. Esperamos que hayas disfrutado tu servicio de ${servicio}. ¡Que tengas un excelente día!`
        : `Hola ${contact.name}, ¿cómo sigues después de tu servicio de ${servicio} hace ${dias} días? Queríamos saber cómo te fue. ¡Saludos!`;
        
      return {
        company_id: companyId,
        contact_id: contact.id,
        phone: contact.phone,
        message: message,
        status: 'enviado',
        scheduled_for: new Date(Date.now() - Math.random() * 86400000 * 5).toISOString() // Sent in the past 5 days
      };
    });
    
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
