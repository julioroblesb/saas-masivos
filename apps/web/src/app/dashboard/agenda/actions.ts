'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const getCompanyId = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) {
      console.error('getCompanyId - Auth Error:', userError);
      return { error: 'Auth Error: ' + userError.message };
    }
    if (!user) {
      console.error('getCompanyId - No User Found');
      return { error: 'No user session found' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    if (profileError) {
      console.error('getCompanyId - Profile Error:', profileError);
      return { error: 'Profile Error: ' + profileError.message };
    }
    if (!profile?.company_id) {
      console.error('getCompanyId - No Company ID in profile');
      return { error: 'No company ID found for this user' };
    }

    return { companyId: profile.company_id };
  } catch (error: unknown) {
    console.error('getCompanyId - Caught Exception:', error);
    return { error: 'Exception: ' + (error instanceof Error ? error.message : 'Error interno') };
  }
};

export async function getAgendaData(startDate?: string, endDate?: string) {
  const supabase = await createClient();

  // Run independent queries in PARALLEL
  const [
    { data: services, error: sErr },
    { data: contacts, error: cErr },
    { data: staff, error: staffErr },
    { data: staffServices },
  ] = await Promise.all([
    supabase
      .from('spa_services')
      .select('id, company_id, name, description, price, promo_price, min_price, duration_days, care_instructions, care_image_url, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('crm_marketing_contacts')
      .select('id, name, phone, document_number')
      .order('name'),
    supabase
      .from('spa_staff')
      .select('id, name, role, is_active')
      .eq('is_active', true)
      .order('name'),
    supabase.from('spa_staff_services').select('staff_id, service_id'),
  ]);

  let visitsQuery = supabase
    .from('spa_visits')
    .select(
      `
      id,
      company_id,
      contact_id,
      service_id,
      staff_id,
      visit_date,
      scheduled_date,
      duration_minutes,
      status,
      price_charged,
      payment_status,
      debt_due_date,
      completed_at,
      notes,
      created_at,
      care_sent,
      follow_up_date,
      follow_up_sent,
      crm_marketing_contacts!spa_visits_contact_tenant_fkey (
        id,
        name,
        phone
      ),
      spa_services ( id, name, price )
    `,
    )
    .order('visit_date', { ascending: false });

  if (startDate) {
    const startBoundary = startDate.includes('T') ? startDate : `${startDate}T00:00:00-05:00`;
    visitsQuery = visitsQuery.gte('visit_date', startBoundary);
  }
  if (endDate) {
    const endBoundary = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999-05:00`;
    visitsQuery = visitsQuery.lte('visit_date', endBoundary);
  } else if (!startDate && !endDate) {
    const now = new Date();
    const past30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const future60 = new Date(now.getTime() + 60 * 86400000).toISOString();
    visitsQuery = visitsQuery.gte('visit_date', past30).lte('visit_date', future60);
  }

  const { data: visits, error: vErr } = await visitsQuery;

  const staffWithServices =
    staff?.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      isActive: s.is_active,
      services:
        staffServices?.filter((ss) => ss.staff_id === s.id).map((ss) => ss.service_id) ||
        [],
    })) || [];

  return {
    services: services || [],
    visits:
      (visits?.map((v) => {
        const contactObj = Array.isArray(v.crm_marketing_contacts)
          ? v.crm_marketing_contacts[0]
          : v.crm_marketing_contacts;
        const serviceObj = Array.isArray(v.spa_services)
          ? v.spa_services[0]
          : v.spa_services;
        return {
          ...v,
          contact_name: contactObj?.name || '',
          contact_phone: contactObj?.phone || '',
          service_name: serviceObj?.name || '',
          crm_marketing_contacts: contactObj ?? null,
          spa_services: serviceObj ? { name: serviceObj.name, price: serviceObj.price } : null,
        };
      }) || []) as import('../atenciones/types').AgendaVisit[],
    contacts: contacts || [],
    staff: staffWithServices,
    error: sErr?.message || vErr?.message || cErr?.message || staffErr?.message,
  };
}

/**
 * Light-weight visit-range fetch used by AgendaView when the user navigates
 * between months. Does NOT re-query services, contacts, staff, or staff_services.
 */
export async function getAgendaVisitsRange(startDate: string, endDate: string): Promise<import('../atenciones/types').AgendaVisit[]> {
  const supabase = await createClient();
  const { data: visits } = await supabase
    .from('spa_visits')
    .select(`
      id,
      company_id,
      contact_id,
      service_id,
      staff_id,
      visit_date,
      scheduled_date,
      duration_minutes,
      status,
      price_charged,
      payment_status,
      debt_due_date,
      completed_at,
      notes,
      created_at,
      care_sent,
      follow_up_date,
      follow_up_sent,
      crm_marketing_contacts!spa_visits_contact_tenant_fkey ( id, name, phone ),
      spa_services ( id, name, price )
    `)
    .gte('visit_date', startDate)
    .lte('visit_date', endDate)
    .order('visit_date', { ascending: false });

  return (visits?.map((v) => {
    const contactObj = Array.isArray(v.crm_marketing_contacts)
      ? v.crm_marketing_contacts[0]
      : v.crm_marketing_contacts;
    const serviceObj = Array.isArray(v.spa_services)
      ? v.spa_services[0]
      : v.spa_services;
    return {
      ...v,
      contact_name: contactObj?.name || '',
      contact_phone: contactObj?.phone || '',
      service_name: serviceObj?.name || '',
      crm_marketing_contacts: contactObj ?? null,
      spa_services: serviceObj ? { name: serviceObj.name, price: serviceObj.price } : null,
    };
  }) || []) as import('../atenciones/types').AgendaVisit[];
}

export async function getStaffAvailabilityAction(staffId: string, date: string) {
  const ctx = await getCompanyId();
  if (ctx?.error) return { error: ctx.error };
  try {
    const [y, m, d] = date.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayOfWeek = targetDate.getDay();
    const supabase = await createClient();

    const [
      { data: schedule },
      { data: blocks },
      { data: visits },
    ] = await Promise.all([
      supabase
        .from('spa_staff_schedules')
        .select('id, company_id, staff_id, day_of_week, start_time, end_time, is_working')
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek)
        .single(),
      supabase
        .from('spa_staff_blocks')
        .select('id, company_id, staff_id, block_date, start_time, end_time, reason')
        .eq('staff_id', staffId)
        .eq('block_date', date),
      supabase
        .from('spa_visits')
        .select('visit_date, duration_minutes, status')
        .eq('staff_id', staffId)
        .in('status', ['agendado', 'en_curso', 'completado'])
        .gte('visit_date', `${date}T00:00:00-05:00`)
        .lte('visit_date', `${date}T23:59:59.999-05:00`),
    ]);

    return {
      schedule: schedule || null,
      blocks: blocks || [],
      visits: visits || [],
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Error interno' };
  }
}

export async function createVisitAction(data: {
  contact_id?: string;
  new_contact?: { name: string; phone: string; document_number?: string };
  service_id: string;
  staff_id: string;
  visit_date: string;
  duration_minutes: number;
}) {
  const ctx = await getCompanyId();
  if (ctx?.error) return { error: ctx.error };
  const companyId = ctx.companyId;

  try {
    const supabase = await createClient();
    let finalContactId = data.contact_id;
    let contactName = '';
    let contactPhone = '';

    if (data.new_contact) {
      const { data: newC, error: errC } = await supabase
        .from('crm_marketing_contacts')
        .insert({
          company_id: companyId,
          name: data.new_contact.name,
          phone: data.new_contact.phone,
          document_number: data.new_contact.document_number,
          tags: ['nuevo_paciente'],
        })
        .select('id')
        .single();
      if (errC) throw errC;
      finalContactId = newC.id;
      contactName = data.new_contact.name;
      contactPhone = data.new_contact.phone || '';
    } else if (data.contact_id) {
      const { data: existingContact } = await supabase
        .from('crm_marketing_contacts')
        .select('name, phone')
        .eq('id', data.contact_id)
        .single();
      contactName = existingContact?.name || '';
      contactPhone = existingContact?.phone || '';
    }

    if (!finalContactId) return { error: 'Debes seleccionar o crear un paciente' };

    const { data: service, error: serviceError } = await supabase
      .from('spa_services')
      .select('id, name, price, is_active, company_id')
      .eq('id', data.service_id)
      .eq('company_id', companyId)
      .single();

    if (serviceError || !service) {
      return { error: 'El servicio seleccionado no existe o no pertenece a la empresa.' };
    }

    if (!service.is_active) {
      return { error: 'El servicio seleccionado se encuentra inactivo.' };
    }

    if (data.staff_id) {
      const { data: hasOverlap, error: overlapError } = await supabase.rpc('check_visit_overlap', {
        p_staff_id: data.staff_id,
        p_visit_date: data.visit_date,
        p_duration_minutes: data.duration_minutes,
      });

      if (overlapError) {
        console.error('Overlap check failed:', overlapError);
      } else if (hasOverlap) {
        return {
          error:
            'El especialista seleccionado ya tiene una cita agendada en ese horario. Por favor, selecciona otro especialista u otro horario.',
        };
      }
    }

    const { data: insertedVisit, error } = await supabase
      .from('spa_visits')
      .insert({
        company_id: companyId,
        contact_id: finalContactId,
        service_id: data.service_id,
        staff_id: data.staff_id,
        visit_date: data.visit_date,
        scheduled_date: data.visit_date,
        duration_minutes: data.duration_minutes,
        price_charged: service.price,
        status: 'agendado',
        payment_status: 'pendiente',
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/agenda');
    revalidatePath('/dashboard/atenciones');
    revalidatePath('/dashboard/cobranza');
    revalidatePath('/dashboard/clientes');
    revalidatePath('/dashboard');

    const enriched: CreatedVisitData = {
      ...insertedVisit,
      contact_name: contactName,
      contact_phone: contactPhone,
      service_name: service.name || '',
      crm_marketing_contacts: {
        id: finalContactId,
        name: contactName || undefined,
        phone: contactPhone || undefined,
      },
      spa_services: { name: service.name || '', price: service.price ?? 0 },
    };
    return { success: true, data: enriched };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Error interno' };
  }
}

/** Typed return of createVisitAction on success */
export interface CreatedVisitData {
  // Matches spa_visits Row exactly
  id: string;
  company_id: string;
  contact_id: string;
  service_id: string;
  staff_id: string | null;
  visit_date: string | null;
  scheduled_date: string | null;
  duration_minutes: number | null;
  status: string;
  price_charged: number | null;
  payment_status: string | null;
  debt_due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string | null;
  care_sent: boolean | null;
  follow_up_date: string | null;
  follow_up_sent: boolean | null;
  // Enriched fields
  contact_name: string;
  contact_phone: string;
  service_name: string;
  crm_marketing_contacts: import('../atenciones/types').FullClientProfileData | null;
  spa_services: { name: string; price: number } | null;
}
