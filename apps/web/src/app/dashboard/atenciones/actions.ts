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
  contact_id?: string;
  new_contact?: { name: string; phone: string };
  service_id: string;
  visit_date: string;
  status: 'en_curso' | 'completado' | 'cancelado';
  price_charged: number;
  notes?: string;
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
    const { data: newContact, error: contactError } = await supabase
      .from('crm_marketing_contacts')
      .insert({
        company_id: profile.company_id,
        name: payload.new_contact.name,
        phone: payload.new_contact.phone,
        tags: ['cliente']
      })
      .select('id')
      .single();
      
    if (contactError) {
      // If it fails, maybe it already exists?
      if (contactError.code === '23505') {
        const { data: existing } = await supabase
          .from('crm_marketing_contacts')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('phone', payload.new_contact.phone)
          .single();
        if (existing) final_contact_id = existing.id;
        else return { error: 'Error al registrar nuevo paciente: ' + contactError.message };
      } else {
        return { error: 'Error al registrar nuevo paciente: ' + contactError.message };
      }
    } else {
      final_contact_id = newContact.id;
    }
  }

  if (!final_contact_id) return { error: 'Debes seleccionar o crear un paciente' };
  
  // Insert visit
  const { data, error } = await supabase
    .from('spa_visits')
    .insert({
      company_id: profile.company_id,
      contact_id: final_contact_id,
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
