'use server';

import { createClient } from '@/utils/supabase/server';

export async function getClientsMetrics() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('rpc_get_clients_metrics');
  
  if (error) {
    console.error('Error fetching client metrics:', error);
    return { error: `Error DB: ${error.message || JSON.stringify(error)}` };
  }
  
  return { data };
}

export async function archiveContactsAction(ids: string[], archive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_archive_contacts', {
    p_contact_ids: ids,
    p_archive: archive
  });
  
  if (error) {
    console.error('Error archiving contacts:', error);
    return { error: 'Ocurrió un error al intentar archivar los contactos' };
  }
  
  return { success: true };
}

export async function deleteContactAction(id: string) {
  const supabase = await createClient();
  
  // Unlink visits to prevent losing financial history
  await supabase.from('spa_visits').update({ contact_id: null }).eq('contact_id', id);
  
  // Delete scheduled messages
  await supabase.from('crm_wa_queue').delete().eq('contact_id', id);
  
  const { error } = await supabase.rpc('rpc_delete_marketing_contact', {
    p_contact_id: id
  });
  
  if (error) {
    console.error('Error deleting contact:', error);
    return { error: 'Ocurrió un error al intentar eliminar el contacto permanentemente' };
  }
  
  return { success: true };
}

export async function upsertContactAction(payload: {
  phone: string;
  name?: string;
  email?: string;
  birthday?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('rpc_upsert_marketing_contact', {
    p_phone: payload.phone,
    p_name: payload.name || null,
    p_tags: ['cliente'],
    p_email: payload.email || null,
    p_birthday: payload.birthday || null,
    p_notes: payload.notes || null
  });
  
  if (error) {
    console.error('Error upserting contact:', error);
    return { error: `Error al guardar contacto: ${error.message}` };
  }
  
  return { success: true, data };
}
