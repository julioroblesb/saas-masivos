import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/utils/supabase';
import type { CRMMarketingContact } from '../../types/crm';
import { mapMarketingContactFromDB } from '../../services/crmMappers';
import { RpcUpsertMarketingContactSchema, RpcBatchInsertMarketingContactsSchema } from '../../shared/validators/crm.schema';

export function useMarketingContacts() {
  return useQuery({
    queryKey: ['marketing-contacts'],
    queryFn: async (): Promise<CRMMarketingContact[]> => {
      const { data, error } = await supabase
        .from('crm_marketing_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) throw error;

      return (data || []).map(mapMarketingContactFromDB);
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
    }
  });
}
