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
      contactName: v.crm_marketing_contacts?.name,
      contactPhone: v.crm_marketing_contacts?.phone,
      serviceName: v.spa_services?.name,
    })) || [],
    contacts: contacts || [],
    error: sErr?.message || vErr?.message || cErr?.message 
  };
}

export async function createVisitAction(payload: {
  contactId: string;
  serviceId: string;
  visitDate: string;
  status: 'en_curso' | 'completado' | 'cancelado';
  priceCharged: number;
  notes?: string;
}) {
  const supabase = await createClient();
  
  // Insert visit
  const { data, error } = await supabase
    .from('spa_visits')
    .insert({
      contact_id: payload.contactId,
      service_id: payload.serviceId,
      visit_date: payload.visitDate,
      status: payload.status,
      price_charged: payload.priceCharged,
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
