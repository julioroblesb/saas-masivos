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
  visit_date: string;
  status: 'en_curso' | 'completado' | 'cancelado' | 'agendada';
  price_charged: number;
  initial_payment: number;
  payment_method: 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta';
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
  
  // LOGICAL FIX FOR TIMEZONE ISSUE:
  // When the frontend sends a date like '2026-06-23', PostgreSQL treats it as midnight UTC (2026-06-23T00:00:00Z).
  // For users in UTC-5 (America/Lima), midnight UTC is 7 PM of the PREVIOUS DAY.
  // To fix this logically, we must convert the 'YYYY-MM-DD' input into a proper TIMESTAMPTZ.
  // If the date is 'today' (locally), we just use the current timestamp (which has the correct time).
  // If it's a future or past date, we append T12:00:00-05:00 to ensure it falls squarely in the correct local day.
  
  const todayLocal = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
  const visit_timestamp = payload.visit_date === todayLocal 
    ? new Date().toISOString() 
    : `${payload.visit_date}T12:00:00-05:00`;
    
  const scheduled_timestamp = payload.scheduled_date === todayLocal 
    ? new Date().toISOString() 
    : `${payload.scheduled_date}T12:00:00-05:00`;

  // Determine payment status
  let payment_status = 'pendiente';
  if (payload.initial_payment >= payload.price_charged && payload.price_charged > 0) {
    payment_status = 'pagado';
  } else if (payload.initial_payment > 0) {
    payment_status = 'parcial';
  }

  // Insert visit
  const { data, error } = await supabase
    .from('spa_visits')
    .insert({
      company_id: profile.company_id,
      contact_id: final_contact_id,
      service_id: payload.service_id,
      visit_date: visit_timestamp,
      scheduled_date: scheduled_timestamp,
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

  // Insert initial payment if amount > 0
  if (payload.initial_payment > 0) {
    const { error: paymentError } = await supabase
      .from('spa_payments')
      .insert({
        company_id: profile.company_id,
        visit_id: data.id,
        amount: payload.initial_payment,
        payment_method: payload.payment_method,
        payment_date: visit_timestamp
      });
      
    if (paymentError) {
      console.error('Error inserting initial payment:', paymentError);
      // Not returning error here to avoid blocking the visit creation, but ideally should use a transaction
    }
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
