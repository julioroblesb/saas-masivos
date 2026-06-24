'use server';

import { createClient } from '@/utils/supabase/server';
import { SpaVisit, SpaService } from '@/types/spa';

export async function getAtencionesData() {
  const supabase = await createClient();
  
  // Get active services
  const { data: services, error: sErr } = await supabase
    .from('spa_services')
    .select('*')
    .eq('is_active', true)
    .order('name');
    
  // Get recent visits
  const { data: visits, error: vErr } = await supabase
    .from('spa_visits')
    .select(`
      *,
      crm_marketing_contacts ( name, phone ),
      spa_services ( name, price )
    `)
    .order('visit_date', { ascending: false })
    .limit(50);
    
  // Get contacts
  const { data: contacts, error: cErr } = await supabase
    .from('crm_marketing_contacts')
    .select('id, name, phone, email')
    .order('name');
    
  // Get active staff
  const { data: staff, error: staffErr } = await supabase
    .from('spa_staff')
    .select('id, name, role')
    .eq('is_active', true)
    .order('name');

  return { 
    services: services || [], 
    visits: visits?.map((v: any) => ({
      ...v,
      contact_name: v.crm_marketing_contacts?.name,
      contact_phone: v.crm_marketing_contacts?.phone,
      service_name: v.spa_services?.name,
    })) || [],
    contacts: contacts || [],
    staff: staff || [],
    error: sErr?.message || vErr?.message || cErr?.message || staffErr?.message
  };
}

export async function createVisitAction(payload: {
  contact_id?: string;
  new_contact?: { name: string; phone: string };
  service_id: string;
  status: 'en_curso' | 'completado' | 'cancelado' | 'agendada';
  price_charged: number;
  scheduled_date: string;
  notes?: string;
  staff_id?: string;
}) {
  const supabase = await createClient();
  
  // Get user's company_id
  const { data: { user } } = await supabase.auth.getUser();
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
    const { data: contactData, error: contactError } = await supabase.rpc('rpc_upsert_marketing_contact', {
      p_phone: payload.new_contact.phone,
      p_name: payload.new_contact.name || '',
      p_tags: ['cliente']
    });

    if (contactError || !contactData) {
      return { error: 'Error al registrar nuevo paciente: ' + (contactError?.message || 'ID nulo') };
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
  let payment_status = 'pendiente';

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
      staff_id: payload.staff_id || null
    })
    .select()
    .single();
    
  if (error) {
    return { error: error.message };
  }
  
  // If status is 'completado', trigger the complete visit RPC
  if (payload.status === 'completado') {
    const { error: rpcError } = await supabase.rpc('rpc_complete_visit', {
      p_visit_id: data.id
    });
    if (rpcError) {
      console.error('Error completing visit RPC:', rpcError);
      return { error: 'Visita creada, pero hubo un error al programar los mensajes de seguimiento: ' + rpcError.message };
    }
  }
  
  return { success: true, data };
}

export async function updateVisitStatusAction(visitId: string, status: 'completado' | 'cancelado') {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('spa_visits')
    .update({ status })
    .eq('id', visitId);
    
  if (error) {
    return { error: error.message };
  }
  
  if (status === 'completado') {
    const { error: rpcError } = await supabase.rpc('rpc_complete_visit', {
      p_visit_id: visitId
    });
    if (rpcError) {
      console.error('Error completing visit RPC:', rpcError);
      return { error: 'Estado actualizado, pero hubo un error al programar los mensajes: ' + rpcError.message };
    }
  }
  
  return { success: true };
}

export async function addPaymentAction(visitId: string, amount: number, paymentMethod: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  if (!profile?.company_id) return { error: 'Empresa no encontrada' };

  // Insert payment
  const { error: paymentError } = await supabase
    .from('spa_payments')
    .insert({
      company_id: profile.company_id,
      visit_id: visitId,
      amount: amount,
      payment_method: paymentMethod,
      payment_date: new Date().toISOString()
    });

  if (paymentError) {
    return { error: paymentError.message };
  }

  // Check total paid and update visit status
  const { data: payments } = await supabase.from('spa_payments').select('amount').eq('visit_id', visitId);
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  
  const { data: visit } = await supabase.from('spa_visits').select('price_charged').eq('id', visitId).single();
  
  if (visit) {
    let payment_status = 'parcial';
    if (totalPaid >= visit.price_charged) payment_status = 'pagado';
    
    await supabase.from('spa_visits').update({ payment_status }).eq('id', visitId);
  }

  return { success: true };
}

export async function completeAndPayVisitAction(visitId: string, payload: {
  payment_method?: string;
  is_credit: boolean;
  initial_payment: number;
  debt_due_date?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  if (!profile?.company_id) return { error: 'Empresa no encontrada' };

  const { data: visit } = await supabase.from('spa_visits').select('price_charged').eq('id', visitId).single();
  if (!visit) return { error: 'Atención no encontrada' };

  // Register payment if amount > 0
  if (payload.initial_payment > 0 && payload.payment_method) {
    const { error: paymentError } = await supabase
      .from('spa_payments')
      .insert({
        company_id: profile.company_id,
        visit_id: visitId,
        amount: payload.initial_payment,
        payment_method: payload.payment_method,
        payment_date: new Date().toISOString()
      });
    if (paymentError) return { error: 'Error registrando abono: ' + paymentError.message };
  }

  // Calculate new total paid
  const { data: payments } = await supabase.from('spa_payments').select('amount').eq('visit_id', visitId);
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  
  let payment_status = 'pendiente';
  if (totalPaid >= visit.price_charged) payment_status = 'pagado';
  else if (totalPaid > 0) payment_status = 'parcial';

  // Construct update payload
  let debtDate = null;
  if (payload.is_credit && payload.debt_due_date && payment_status !== 'pagado') {
    debtDate = new Date(payload.debt_due_date).toISOString();
  }

  const { error: updateError } = await supabase
    .from('spa_visits')
    .update({ 
      status: 'completado',
      completed_at: new Date().toISOString(),
      payment_status,
      debt_due_date: debtDate,
      notes: payload.notes
    })
    .eq('id', visitId);

  if (updateError) return { error: 'Error finalizando atención: ' + updateError.message };

  // Trigger followups logic since it is completado
  try {
    await supabase.rpc('rpc_schedule_spa_followups', { p_visit_id: visitId });
  } catch(e) {
    console.error('Failed to trigger followups', e);
  }

  return { success: true };
}

export async function deleteVisitAction(visitId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Eliminar abonos primero si existieran (la base de datos podría tener ON DELETE CASCADE, pero aseguramos)
  await supabase.from('spa_payments').delete().eq('visit_id', visitId);

  const { error } = await supabase.from('spa_visits').delete().eq('id', visitId);
  if (error) return { error: error.message };

  return { success: true };
}

export async function editVisitAction(visitId: string, payload: {
  service_id: string;
  staff_id?: string;
  scheduled_date: string;
  price_charged: number;
  status: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
      notes: payload.notes
    })
    .eq('id', visitId);

  if (error) return { error: error.message };
  return { success: true };
}
