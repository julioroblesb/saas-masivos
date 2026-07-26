import { z } from 'zod';

export const evolutionWebhookSchema = z
  .object({
    id: z.string().optional(),
    event: z.string().optional(),
    instance: z.string().optional(),
    from: z.string().optional(),
    phone: z.string().optional(),
    data: z
      .object({
        key: z
          .object({
            id: z.string().optional(),
            fromMe: z.boolean().optional(),
            remoteJid: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    messages: z
      .array(
        z
          .object({
            from: z.string().optional(),
            key: z
              .object({
                id: z.string().optional(),
                remoteJid: z.string().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export type EvolutionWebhook = z.infer<typeof evolutionWebhookSchema>;

export function extractEvolutionPhone(body: EvolutionWebhook): string {
  const jid =
    body.data?.key?.remoteJid ??
    body.from ??
    body.messages?.[0]?.from ??
    body.messages?.[0]?.key?.remoteJid ??
    body.phone ??
    '';

  return jid.split('@')[0]?.replace(/\D/g, '') ?? '';
}
