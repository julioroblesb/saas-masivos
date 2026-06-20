'use server';

import { createClient } from '@/utils/supabase/server';

export async function getClientsMetrics() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('rpc_get_clients_metrics');
  
  if (error) {
    console.error('Error fetching client metrics:', error);
    return { error: 'No se pudieron obtener las métricas de los clientes' };
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
