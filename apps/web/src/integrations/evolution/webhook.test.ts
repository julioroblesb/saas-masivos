import { describe, expect, it } from 'vitest';
import { evolutionWebhookSchema, extractEvolutionPhone } from './webhook';

describe('Evolution webhook contract', () => {
  it('accepts and normalizes a messages upsert payload', () => {
    const payload = evolutionWebhookSchema.parse({
      event: 'MESSAGES_UPSERT',
      instance: 'company_123',
      data: {
        key: {
          id: 'message-123',
          fromMe: false,
          remoteJid: '51999-888-777@s.whatsapp.net',
        },
      },
    });

    expect(extractEvolutionPhone(payload)).toBe('51999888777');
  });

  it('supports legacy message arrays without trusting arbitrary values', () => {
    const payload = evolutionWebhookSchema.parse({
      messages: [{ key: { remoteJid: '51999999999@s.whatsapp.net' } }],
    });

    expect(extractEvolutionPhone(payload)).toBe('51999999999');
    expect(evolutionWebhookSchema.safeParse('not-an-object').success).toBe(false);
  });

  it('identifies outgoing messages', () => {
    const payload = evolutionWebhookSchema.parse({
      data: { key: { fromMe: true } },
    });

    expect(payload.data?.key?.fromMe).toBe(true);
  });
});
