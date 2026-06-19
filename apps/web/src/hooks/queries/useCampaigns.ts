/**
 * useCampaigns.ts — Hooks de React Query para el sistema de campañas de WhatsApp
 *
 * Fuente de datos: tablas crm_wa_campaigns y crm_wa_queue (migración 099).
 *
 * Patrón: Sigue exactamente la convención de useMarketingContacts.ts —
 * un hook por entidad, query keys canónicos, validación Zod antes de RPC.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/utils/supabase';
import type { WaCampaign, WaQueueItem, CreateCampaignPayload } from '../../types/crm';
import { mapWaCampaignFromDB, mapWaQueueItemFromDB } from '../../services/crmMappers';
import { RpcCreateCampaignSchema, RpcCancelCampaignSchema } from '../../shared/validators/crm.schema';
import { crmToast } from '../useToast';

// ── Query Keys canónicos ───────────────────────────────────────────────────────
// Centralizar aquí para evitar strings mágicos dispersos en la aplicación.
export const CAMPAIGNS_QUERY_KEY  = ['wa-campaigns'] as const;
export const QUEUE_QUERY_KEY      = (campaignId: string) => ['wa-queue', campaignId] as const;

// ── useCampaigns ──────────────────────────────────────────────────────────────

/**
 * Obtiene la lista de todas las campañas de WhatsApp.
 *
 * POLLING INTELIGENTE: Si alguna campaña está en estado 'running' o 'queued',
 * activa un refetch automático cada 15 segundos para mostrar el progreso en
 * tiempo real. Cuando no hay campañas activas, el polling se desactiva
 * automáticamente para no generar queries innecesarias.
 */
export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: async (): Promise<WaCampaign[]> => {
      const { data, error } = await supabase
        .from('crm_wa_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapWaCampaignFromDB);
    },
    refetchInterval: (query) => {
      const campaigns = query.state.data as WaCampaign[] | undefined;
      if (!campaigns) return false;
      const hasActive = campaigns.some(c => c.status === 'running' || c.status === 'queued');
      return hasActive ? 15_000 : false;
    },
    staleTime: 1000 * 60 * 2
  });
}

// ── useCampaignQueue ──────────────────────────────────────────────────────────

/**
 * Obtiene los items de la cola de una campaña específica.
 * Usado en la vista de detalle / historial.
 */
export function useCampaignQueue(campaignId: string) {
  return useQuery({
    queryKey: QUEUE_QUERY_KEY(campaignId),
    queryFn: async (): Promise<WaQueueItem[]> => {
      const { data, error } = await supabase
        .from('crm_wa_queue')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapWaQueueItemFromDB);
    },
    enabled: !!campaignId,
    staleTime: 120000,
  });
}

// ── useCreateCampaign ─────────────────────────────────────────────────────────

/**
 * Crea una nueva campaña y encola todos los mensajes.
 * Valida el payload con Zod antes de enviar al RPC (AGENTS.md regla #2).
 *
 * El frontend resuelve el Spintax por contacto antes de llamar a esta mutation.
 * El RPC recibe el contenido ya final de cada mensaje por contacto.
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCampaignPayload) => {
      // Obtener el UUID del usuario actual para auditoría
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      const rpcPayload = {
        p_name:          payload.name,
        p_target_tag:    payload.targetTag,
        p_sequence:      payload.sequence,
        p_contacts:      payload.contacts,
        p_min_delay_sec: payload.minDelaySec,
        p_max_delay_sec: payload.maxDelaySec,
        p_created_by:    userId,
      };

      // Validación Zod obligatoria antes de cualquier RPC (AGENTS.md regla #2)
      const parsed = RpcCreateCampaignSchema.safeParse(rpcPayload);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        throw new Error(`Error de validación: ${firstError.message} (${firstError.path.join('.')})`);
      }

      const { data, error } = await supabase.rpc('rpc_create_campaign', parsed.data);
      if (error) throw error;

      // El RPC retorna { success, campaign_id, queued_items, contacts }
      const result = data as { success: boolean; campaign_id?: string; queued_items?: number; error?: string };
      if (!result?.success) {
        throw new Error(result?.error ?? 'Error al crear la campaña');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
      crmToast.success(`Campaña encolada — ${data.queued_items ?? 0} mensajes programados`);
    },
    onError: (error: Error) => {
      console.error('[useCreateCampaign]', error.message);
      crmToast.error(`Error al crear campaña: ${error.message}`);
    }
  });
}

// ── useCancelCampaign ─────────────────────────────────────────────────────────

/**
 * Cancela una campaña activa y purga sus mensajes pendientes.
 * Los mensajes ya enviados se conservan en el historial.
 */
export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Validación Zod
      const parsed = RpcCancelCampaignSchema.safeParse({ p_campaign_id: campaignId });
      if (!parsed.success) {
        throw new Error('UUID de campaña inválido');
      }

      const { data, error } = await supabase.rpc('rpc_cancel_campaign', parsed.data);
      if (error) throw error;

      const result = data as { success: boolean; items_removed?: number; error?: string };
      if (!result?.success) {
        throw new Error(result?.error ?? 'Error al cancelar la campaña');
      }

      return result;
    },
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY(campaignId) });
      crmToast.success('Campaña cancelada');
    },
    onError: (error: Error) => {
      console.error('[useCancelCampaign]', error.message);
      crmToast.error(`Error al cancelar: ${error.message}`);
    }
  });
}
