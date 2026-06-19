import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/utils/supabase';
import type { CRMMarketingContact } from '../../types/crm';
import { mapMarketingContactFromDB } from '../../services/crmMappers';
import { RpcUpsertMarketingContactSchema, RpcBatchInsertMarketingContactsSchema } from '../../shared/validators/crm.schema';
import { crmToast } from '../useToast';

export function useMarketingContacts(page: number = 1, pageSize: number = 100, search: string = '') {
  return useQuery({
    queryKey: ['marketing-contacts', page, pageSize, search],
    queryFn: async (): Promise<{ data: CRMMarketingContact[]; count: number }> => {
      let query;

      if (search.trim()) {
        query = supabase.rpc('search_contacts', { search_term: search.trim() }, { count: 'exact' });
      } else {
        query = supabase.from('crm_marketing_contacts').select('*', { count: 'exact' });
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      return {
        data: (data || []).map(mapMarketingContactFromDB),
        count: count || 0
      };
    },
    staleTime: 1000 * 60 * 2
  });
}

export function useUpsertMarketingContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: { phone: string; name?: string; tags?: string[] }) => {
      const payload = {
        p_phone: contact.phone,
        p_name: contact.name || null,
        p_tags: contact.tags || []
      };
      RpcUpsertMarketingContactSchema.parse(payload);
      const { data, error } = await supabase.rpc('rpc_upsert_marketing_contact', payload);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
      crmToast.success('Contacto guardado exitosamente');
    },
    onError: (error: Error) => {
      console.error('[useUpsertMarketingContact]', error);
      crmToast.error(`Error al guardar contacto: ${error.message}`);
    }
  });
}

export function useBatchInsertMarketingContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: { phone: string; name?: string; tags?: string[] }[]) => {
      const payload = { p_contacts: contacts };
      RpcBatchInsertMarketingContactsSchema.parse(payload);
      const { data, error } = await supabase.rpc('rpc_batch_insert_marketing_contacts', payload);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
      crmToast.success('Contactos importados exitosamente');
    },
    onError: (error: Error) => {
      console.error('[useBatchInsertMarketingContacts]', error);
      crmToast.error(`Error al importar contactos: ${error.message}`);
    }
  });
}

export function useDeleteMarketingContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('rpc_delete_marketing_contact', {
        p_id: id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
      crmToast.success('Contacto eliminado');
    },
    onError: (error: Error) => {
      console.error('[useDeleteMarketingContact]', error);
      crmToast.error(`Error al eliminar contacto: ${error.message}`);
    }
  });
}

export function useDeleteMarketingContactsByTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: string) => {
      // Validate schema if needed (or just ensure it's a string)
      if (!tag || tag.trim() === '') throw new Error('Etiqueta vacía');
      
      const { data, error } = await supabase.rpc('rpc_delete_marketing_contacts_by_tag', {
        p_tag: tag.trim()
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
    },
    onError: (error: Error) => {
      console.error('[useDeleteMarketingContactsByTag]', error);
      crmToast.error(`Error al eliminar contactos: ${error.message}`);
    }
  });
}
