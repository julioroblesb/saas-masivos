import { z } from 'zod';

// Utilidad para validar UUIDs de PostgreSQL
const pgUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pgUuid = (msg?: string) => z.string().regex(pgUuidRegex, msg || 'UUID inválido');

// === MARKETING CAMPAIGNS ===
export const RpcUpsertMarketingContactSchema = z.object({
  p_phone: z.string().min(5),
  p_name: z.string().nullable().optional(),
  p_tags: z.array(z.string()).optional()
}).strict();

export const RpcBatchInsertMarketingContactsSchema = z.object({
  p_contacts: z.array(z.object({
    phone: z.string().min(5),
    name: z.string().optional(),
    tags: z.array(z.string()).optional()
  }))
}).strict();

// === SISTEMA DE COLA DE CAMPAÑAS WHATSAPP (migración 099) ===

/**
 * Schema para el payload de rpc_create_campaign.
 * Valida que los delays sean seguros (mínimo 30s para anti-ban).
 * Los contacts incluyen los mensajes ya resueltos con Spintax (string[]).
 */
export const RpcCreateCampaignSchema = z.object({
  p_name:          z.string().min(1, 'El nombre no puede estar vacío').max(100),
  p_target_tag:    z.string().nullable(),
  p_sequence:      z.array(z.object({
    type:         z.enum(['text', 'image', 'video', 'audio', 'document']),
    content:      z.string(),
    mediaUrl:     z.string().url().optional(),
    delayAfterMs: z.number().int().min(0)
  })).min(1, 'La secuencia debe tener al menos un mensaje'),
  p_contacts:      z.array(z.object({
    phone:    z.string().min(5, 'Teléfono inválido'),
    name:     z.string().optional(),
    messages: z.array(z.string())  // content resuelto (Spintax aplicado), uno por paso
  })).min(1, 'Debe haber al menos un contacto'),
  p_min_delay_sec: z.number().int().min(5, 'El delay mínimo para testing es 5s').max(600),
  p_max_delay_sec: z.number().int().min(5).max(600),
  p_created_by:    pgUuid().nullable().optional()
}).strict()
  .refine(d => d.p_max_delay_sec >= d.p_min_delay_sec, {
    message: 'El delay máximo debe ser mayor o igual al mínimo',
    path: ['p_max_delay_sec']
  });

export const RpcCancelCampaignSchema = z.object({
  p_campaign_id: pgUuid('UUID de campaña inválido')
}).strict();

export type RpcCreateCampaignStrict = z.infer<typeof RpcCreateCampaignSchema>;
export type RpcCancelCampaignStrict = z.infer<typeof RpcCancelCampaignSchema>;
