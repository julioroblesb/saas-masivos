'use server';

import { randomUUID } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const completeVisitSchema = z
  .object({
    payment_method: z.string().trim().min(1).max(80).optional(),
    is_credit: z.boolean(),
    initial_payment: z.number().finite().min(0),
    debt_due_date: z.string().date().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine(
    (payload) =>
      payload.initial_payment === 0 || payload.payment_method !== undefined,
    { message: 'Selecciona un método de pago', path: ['payment_method'] },
  )
  .refine(
    (payload) => !payload.is_credit || payload.debt_due_date !== undefined,
    {
      message: 'Selecciona la fecha de pago de la deuda',
      path: ['debt_due_date'],
    },
  );

const addPaymentSchema = z.object({
  amount: z.number().finite().positive(),
  paymentMethod: z.string().trim().min(1).max(80),
  visitId: z.string().uuid(),
});

export async function getAtencionesData(startDate?: string, endDate?: string) {
  const supabase = await createClient();

  // Get active services
  const { data: services, error: sErr } = await supabase
    .from('spa_services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  let visitsQuery = supabase
    .from('spa_visits')
    .select(
      `
      *,
      crm_marketing_contacts ( name, phone ),
      spa_services ( name, price )
    `,
    )
    .order('visit_date', { ascending: false });

  if (startDate) {
    visitsQuery = visitsQuery.gte('visit_date', startDate);
  }
  if (endDate) {
    visitsQuery = visitsQuery.lte('visit_date', endDate + 'T23:59:59.999Z');
  } else if (!startDate && !endDate) {
    visitsQuery = visitsQuery.limit(50);
  }

  const { data: visits, error: vErr } = await visitsQuery;

  // Get contacts
  const { data: contacts, error: cErr } = await supabase
    .from('crm_marketing_contacts')
    .select('id, name, phone, email, document_number')
    .order('name');

  // Get active staff
  const { data: staff, error: staffErr } = await supabase
    .from('spa_staff')
    .select('id, name, role, is_active')
    .eq('is_active', true)
    .order('name');

  const { data: staffServices } = await supabase
    .from('spa_staff_services')
    .select('staff_id, service_id');

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

  // Get payment methods from company settings
  let paymentMethods = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    if (profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', profile.company_id)
        .single();
      if (company?.settings?.payment_methods && company.settings.payment_methods.length > 0) {
        paymentMethods = company.settings.payment_methods;
      }
    }
  }

  return {
    services: services || [],
    visits:
      visits?.map((v) => ({
        ...v,
        contact_name: v.crm_marketing_contacts?.name,
        contact_phone: v.crm_marketing_contacts?.phone,
        service_name: v.spa_services?.name,
      })) || [],
    contacts: contacts || [],
    staff: staffWithServices,
    paymentMethods,
    error: sErr?.message || vErr?.message || cErr?.message || staffErr?.message,
  };
}

export async function createVisitAction(payload: {
  contact_id?: string;
  new_contact?: { name: string; phone: string };
  service_id: string;
  status: 'en_curso' | 'completado' | 'cancelado' | 'agendado';
  price_charged: number;
  scheduled_date: string;
  notes?: string;
  staff_id?: string;
}) {
  const supabase = await createClient();

  // Get user's company_id
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) return { error: 'Empresa no encontrada' };

  let final_contact_id = payload.contact_id;
  // Create new contact if requested
  if (payload.new_contact && payload.new_contact.phone) {
    const { data: contactData, error: contactError } = await supabase.rpc(
      'rpc_upsert_marketing_contact',
      {
        p_phone: payload.new_contact.phone,
        p_name: payload.new_contact.name || '',
        p_tags: ['cliente'],
        p_opt_in_source: null,
        p_email: null,
        p_birthday: null,
        p_allergies_and_conditions: null,
        p_preferences: null,
        p_internal_notes: null,
        p_document_number: null,
      },
    );

    if (contactError || !contactData) {
      return {
        error: 'Error al registrar nuevo paciente: ' + (contactError?.message || 'ID nulo'),
      };
    }

    final_contact_id = contactData.id;
  }

  if (!final_contact_id) return { error: 'Debes seleccionar o crear un paciente' };

  // Logica de Status basada en fecha:
  // Si scheduled_date es hoy, es en_curso, si es futuro agendada.
  // Pero lo manejamos en el frontend o respetamos lo enviado.

  // scheduled_date viene del datetime-local, así que ya tiene hora, pero asume timezone local.
  // Es mejor usarlo directo. Si el usuario seleccionó "hoy", el frontend manda status='en_curso'.
  // Y si es cita futura status='agendada'.
  const visit_timestamp = new Date(payload.scheduled_date).toISOString();

  // Determine payment status (siempre pendiente al inicio, no cobramos al crear)
  const payment_status = 'pendiente';

  // Check overlap if staff is selected
  if (payload.staff_id) {
    const { data: hasOverlap, error: overlapError } = await supabase.rpc('check_visit_overlap', {
      p_staff_id: payload.staff_id,
      p_visit_date: visit_timestamp,
      p_duration_minutes: 60,
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

  // Insert visit
  const { data, error } = await supabase
    .from('spa_visits')
    .insert({
      company_id: profile.company_id,
      contact_id: final_contact_id,
      service_id: payload.service_id,
      visit_date: visit_timestamp, // Usamos la misma fecha como visit_date y scheduled_date para unificar
      scheduled_date: visit_timestamp,
      status: payload.status,
      price_charged: payload.price_charged,
      payment_status,
      notes: payload.notes,
      staff_id: payload.staff_id || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // A completed visit must go through the transactional database workflow.
  if (payload.status === 'completado') {
    const { error: completeError } = await supabase.rpc(
      'rpc_complete_visit',
      { p_visit_id: data.id },
    );
    if (completeError) {
      return {
        error:
          'Visita creada, pero no se pudo completar: ' +
          completeError.message,
      };
    }
  }

  return { success: true, data };
}

export async function updateVisitStatusAction(
  visitId: string,
  status: 'completado' | 'cancelado' | 'no_asistio',
) {
  const supabase = await createClient();

  if (status === 'completado') {
    const { error } = await supabase.rpc('rpc_complete_visit', {
      p_visit_id: visitId,
    });
    return error ? { error: error.message } : { success: true };
  }

  const { error } = await supabase.rpc('rpc_set_visit_outcome', {
    p_status: status,
    p_visit_id: visitId,
  });
  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function addPaymentAction(visitId: string, amount: number, paymentMethod: string) {
  const parsed = addPaymentSchema.safeParse({ amount, paymentMethod, visitId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos de abono inválidos' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase.rpc('rpc_add_visit_payment', {
    p_amount: parsed.data.amount,
    p_idempotency_key: randomUUID(),
    p_payment_method: parsed.data.paymentMethod,
    p_visit_id: parsed.data.visitId,
  });
  return error ? { error: error.message } : { success: true, data };
}

export async function completeAndPayVisitAction(
  visitId: string,
  payload: {
    payment_method?: string;
    is_credit: boolean;
    initial_payment: number;
    debt_due_date?: string;
    notes?: string;
  },
) {
  const parsed = completeVisitSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        'Los datos para completar la atención no son válidos',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase.rpc('rpc_complete_visit', {
    p_debt_due_date: parsed.data.debt_due_date,
    p_initial_payment: parsed.data.initial_payment,
    p_is_credit: parsed.data.is_credit,
    p_notes: parsed.data.notes,
    p_payment_method: parsed.data.payment_method,
    p_visit_id: visitId,
  });
  if (error) {
    return { error: 'Error finalizando atención: ' + error.message };
  }

  return { success: true, data };
}

export async function deleteVisitAction(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Preserve the visit, payments and audit trail.
  const { error } = await supabase.rpc('rpc_set_visit_outcome', {
    p_status: 'cancelado',
    p_visit_id: visitId,
  });
  if (error) return { error: error.message };

  return { success: true };
}

export async function editVisitAction(
  visitId: string,
  payload: {
    service_id: string;
    staff_id?: string;
    scheduled_date: string;
    price_charged: number;
    status: string;
    notes?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase
    .from('spa_visits')
    .update({
      service_id: payload.service_id,
      staff_id: payload.staff_id || null,
      scheduled_date: new Date(payload.scheduled_date).toISOString(),
      visit_date: new Date(payload.scheduled_date).toISOString(),
      price_charged: payload.price_charged,
      status: payload.status,
      notes: payload.notes,
    })
    .eq('id', visitId);

  if (error) return { error: error.message };

  return { success: true };
}
export async function rescheduleVisitAction(visitId: string, newDate: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    if (!profile?.company_id) return { error: 'Empresa no encontrada' };

    // 1. Get original visit
    const { data: oldVisit, error: fetchErr } = await supabase
      .from('spa_visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (fetchErr || !oldVisit) return { error: 'Atención no encontrada' };

    // 2. Mark old visit as cancelled with note
    const { error: cancelErr } = await supabase
      .from('spa_visits')
      .update({
        status: 'cancelado',
        notes: `${oldVisit.notes || ''}\n[Reprogramada para el ${new Date(newDate).toLocaleString('es-PE')}]`,
      })
      .eq('id', visitId);

    if (cancelErr) return { error: cancelErr.message };

    // 3. Create new visit
    const newVisitData = {
      company_id: oldVisit.company_id,
      contact_id: oldVisit.contact_id,
      service_id: oldVisit.service_id,
      staff_id: oldVisit.staff_id,
      price_charged: oldVisit.price_charged,
      notes: oldVisit.notes,
      visit_date: new Date(newDate).toISOString(),
      scheduled_date: new Date(newDate).toISOString(),
      status: 'agendada', // Automatically becomes en_curso based on date via trigger or frontend
    };

    const { error: insertErr } = await supabase.from('spa_visits').insert([newVisitData]);

    if (insertErr) return { error: insertErr.message };

    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Error interno' };
  }
}
