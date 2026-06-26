'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const getCompanyId = async () => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('getCompanyId - Auth Error:', userError);
      return { error: 'Auth Error: ' + userError.message };
    }
    if (!user) {
      console.error('getCompanyId - No User Found');
      return { error: 'No user session found' };
    }
    
    const { data: profile, error: profileError } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (profileError) {
      console.error('getCompanyId - Profile Error:', profileError);
      return { error: 'Profile Error: ' + profileError.message };
    }
    if (!profile?.company_id) {
      console.error('getCompanyId - No Company ID in profile');
      return { error: 'No company ID found for this user' };
    }
    
    return { companyId: profile.company_id };
  } catch (err: any) {
    console.error('getCompanyId - Caught Exception:', err);
    return { error: 'Exception: ' + err.message };
  }
};

export async function getStaffAvailabilityAction(staffId: string, date: string) {
  const ctx = await getCompanyId();
  if (ctx?.error) return { error: ctx.error };
  const companyId = ctx.companyId;

  try {
    const [y, m, d] = date.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday...
    const supabase = await createClient();

    // 1. Get base schedule
    const { data: schedule } = await supabase
      .from('spa_staff_schedules')
      .select('*')
      .eq('staff_id', staffId)
      .eq('day_of_week', dayOfWeek)
      .single();

    // 2. Get blocks
    const { data: blocks } = await supabase
      .from('spa_staff_blocks')
      .select('*')
      .eq('staff_id', staffId)
      .eq('block_date', date);

    // 3. Get existing visits (ignore cancelled/no show)
    // Querying with Peru timezone offset (-05:00) to ensure accurate day bounds
    const startIso = `${date}T00:00:00-05:00`;
    const endIso = `${date}T23:59:59-05:00`;

    const { data: visits } = await supabase
      .from('spa_visits')
      .select('visit_date, duration_minutes, status')
      .eq('staff_id', staffId)
      .in('status', ['agendado', 'en_curso', 'completado'])
      .gte('visit_date', startIso)
      .lte('visit_date', endIso);

    return {
      schedule: schedule || null,
      blocks: blocks || [],
      visits: visits || []
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createVisitAction(data: {
  contact_id?: string;
  new_contact?: { name: string; phone: string; document_number?: string };
  service_id: string;
  staff_id: string;
  visit_date: string; // ISO string with time
  duration_minutes: number;
}) {
  const ctx = await getCompanyId();
  if (ctx?.error) return { error: ctx.error };
  const companyId = ctx.companyId;

  try {
    const supabase = await createClient();
    let finalContactId = data.contact_id;

    if (data.new_contact) {
      const { data: newC, error: errC } = await supabase
        .from('crm_marketing_contacts')
        .insert({
          company_id: companyId,
          name: data.new_contact.name,
          phone: data.new_contact.phone,
          document_number: data.new_contact.document_number,
          tags: ['nuevo_paciente']
        })
        .select('id')
        .single();
      if (errC) throw errC;
      finalContactId = newC.id;
    }

    if (!finalContactId) return { error: 'Contact is required' };

    const { error } = await supabase
      .from('spa_visits')
      .insert({
        company_id: companyId,
        contact_id: finalContactId,
        service_id: data.service_id,
        staff_id: data.staff_id,
        visit_date: data.visit_date,
        duration_minutes: data.duration_minutes,
        status: 'agendado',
        payment_status: 'pendiente'
      });

    if (error) throw error;
    
    revalidatePath('/dashboard/agenda');
    revalidatePath('/dashboard/atenciones');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
