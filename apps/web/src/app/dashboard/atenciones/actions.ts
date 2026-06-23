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

  return { 
    services: services || [], 
    visits: visits?.map((v: any) => ({
      ...v,
      contact_name: v.crm_marketing_contacts?.name,
      contact_phone: v.crm_marketing_contacts?.phone,
      service_name: v.spa_services?.name,
    })) || [],
    contacts: contacts || [],
    error: sErr?.message || vErr?.message || cErr?.message 
  };
}

export async function createVisitAction(payload: {
  contact_id: string;
  service_id: string;
  visit_date: string;
  status: 'en_curso' | 'completado' | 'cancelado';
  price_charged: number;
  notes?: string;
}) {
  const supabase = await createClient();
  
  // Insert visit
  const { data, error } = await supabase
    .from('spa_visits')
    .insert({
      contact_id: payload.contact_id,
      service_id: payload.service_id,
      visit_date: payload.visit_date,
      status: payload.status,
      price_charged: payload.price_charged,
      notes: payload.notes
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
