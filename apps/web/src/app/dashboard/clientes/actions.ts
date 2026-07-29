'use server';

import { createClient } from '@/utils/supabase/server';
import { normalizePeruPhone } from '@/shared/utils/phone';

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
    p_archive: archive,
  });

  if (error) {
    console.error('Error archiving contacts:', error);
    return { error: 'Ocurrió un error al intentar archivar los contactos' };
  }

  return { success: true };
}

export async function deleteContactAction(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('rpc_delete_marketing_contact', {
    p_contact_id: id,
  });

  if (error) {
    console.error('Error deleting contact:', error);
    return { error: 'Ocurrió un error al intentar archivar el contacto' };
  }

  if (typeof data === 'object' && data !== null && 'success' in data && data.success === false) {
    return {
      error:
        'error' in data && typeof data.error === 'string'
          ? data.error
          : 'No se pudo archivar el contacto',
    };
  }

  return { success: true };
}

export async function upsertContactAction(payload: {
  phone: string;
  name?: string;
  email?: string;
  birthday?: string;
  optInSource?: string;
  allergiesAndConditions?: string;
  preferences?: string;
  internalNotes?: string;
  documentNumber?: string;
  customerSegment?: string;
}) {
  const phone = normalizePeruPhone(payload.phone);
  if (!phone) {
    return { error: 'Ingresa un celular peruano de 9 dígitos, por ejemplo 996 552 871.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('rpc_upsert_marketing_contact', {
    p_phone: phone,
    p_name: payload.name || null,
    p_tags: ['cliente'],
    p_opt_in_source: payload.optInSource || null,
    p_email: payload.email || null,
    p_birthday: payload.birthday || null,
    p_allergies_and_conditions: payload.allergiesAndConditions || null,
    p_preferences: payload.preferences || null,
    p_internal_notes: payload.internalNotes || null,
    p_document_number: payload.documentNumber || null,
    p_customer_segment: payload.customerSegment || null,
    p_customer_segment_manual: Boolean(payload.customerSegment),
  });

  if (error) {
    console.error('Error upserting contact:', error);
    return { error: `Error al guardar contacto: ${error.message}` };
  }

  return { success: true, data };
}
