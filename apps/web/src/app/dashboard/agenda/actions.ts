'use server';

import { supabase } from '@/shared/utils/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const getCompanyId = async () => {
  const cookieStore = await cookies();
  const companyId = cookieStore.get('companyId')?.value;
  return companyId;
};

export async function getStaffAvailabilityAction(staffId: string, date: string) {
  const companyId = await getCompanyId();
  if (!companyId) return { error: 'No company context' };

  try {
    const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday...
    
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
    // visit_date includes time in postgres typically, but we should query by day
    // Since visit_date is TIMESTAMPTZ, we need to filter range.
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const { data: visits } = await supabase
      .from('spa_visits')
      .select('visit_date, duration_minutes, status')
      .eq('staff_id', staffId)
      .in('status', ['agendado', 'en_curso', 'completado'])
      .gte('visit_date', startDate.toISOString())
      .lte('visit_date', endDate.toISOString());

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
  contact_id: string;
  service_id: string;
  staff_id: string;
  visit_date: string; // ISO string with time
  duration_minutes: number;
}) {
  const companyId = await getCompanyId();
  if (!companyId) return { error: 'No company context' };

  try {
    const { error } = await supabase
      .from('spa_visits')
      .insert({
        company_id: companyId,
        contact_id: data.contact_id,
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
