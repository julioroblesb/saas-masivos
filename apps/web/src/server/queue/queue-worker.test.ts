import { describe, expect, it, vi } from 'vitest';
import { EvolutionApiError } from '@/integrations/evolution/client';
import type { WhatsAppProvider } from '@/integrations/whatsapp/provider';
import type { QueueItem, QueueRepositoryPort } from './queue-repository';
import {
  currentDailyCount,
  dailyLimit,
  isInsideSendingWindow,
  QueueWorker,
  randomDelayMs,
  type QueueSession,
} from './queue-worker';

const now = new Date('2026-07-26T15:00:00.000Z');
const session: QueueSession = {
  evolution_instance_name: 'company_123',
  company_id: '00000000-0000-4000-8000-000000000001',
  connection_started_at: '2026-07-20T15:00:00.000Z',
  daily_reset_at: '2026-07-26T10:00:00.000Z',
  daily_sent_count: 3,
  next_allowed_send_at: null,
};
const item = {
  campaign_id: null,
  company_id: session.company_id,
  delay_after_ms: 5_000,
  id: '00000000-0000-4000-8000-000000000002',
  media_url: null,
  message: 'Hola',
  phone: '51999999999',
} as QueueItem;

function repository(overrides: Partial<QueueRepositoryPort> = {}): QueueRepositoryPort {
  return {
    claim: vi.fn(async () => item),
    complete: vi.fn(async () => true),
    fail: vi.fn(async () => 'retry_scheduled'),
    markProcessing: vi.fn(async () => true),
    messageContext: vi.fn(async () => ({
      maxDelaySeconds: 45,
      minDelaySeconds: 15,
      settings: {},
    })),
    recordFailure: vi.fn(async () => 'conectado'),
    recordSuccess: vi.fn(async () => undefined),
    ...overrides,
  };
}

function provider(
  sendText: WhatsAppProvider['sendText'] = vi.fn(async () => ({
    providerMessageId: 'provider-123',
  })),
): WhatsAppProvider {
  return {
    configureWebhook: vi.fn(async () => undefined),
    createInstance: vi.fn(async () => ({ qrCode: null })),
    deleteInstance: vi.fn(async () => undefined),
    getConnectionState: vi.fn(async () => ({ state: 'open' })),
    getQrCode: vi.fn(async () => ({ qrCode: null })),
    logoutInstance: vi.fn(async () => undefined),
    sendMedia: vi.fn(async () => ({ providerMessageId: 'provider-123' })),
    sendText,
  };
}

describe('QueueWorker', () => {
  it('claims, sends and completes one item without sleeping', async () => {
    const repo = repository();
    const whatsapp = provider();
    const worker = new QueueWorker(repo, whatsapp, {
      now: () => now,
      random: () => 0.5,
    });

    await expect(worker.processCompany(session, 'worker-1')).resolves.toEqual({
      outcome: 'sent',
      providerMessageId: 'provider-123',
      queueId: item.id,
    });
    expect(repo.claim).toHaveBeenCalledWith(session.company_id, 'worker-1', true);
    expect(repo.complete).toHaveBeenCalledWith(item.id, 'worker-1', 'provider-123');
    expect(repo.recordSuccess).toHaveBeenCalledWith(
      session.company_id,
      new Date('2026-07-26T15:00:05.000Z'),
    );
  });

  it('schedules a retry when the provider reports a transient error', async () => {
    const error = new EvolutionApiError('Proveedor no disponible', 'UNAVAILABLE', 503, true);
    const repo = repository();
    const worker = new QueueWorker(repo, provider(vi.fn(async () => Promise.reject(error))), {
      now: () => now,
    });

    await expect(worker.processCompany(session, 'worker-1')).resolves.toEqual({
      outcome: 'failed',
      queueId: item.id,
      state: 'retry_scheduled',
    });
    expect(repo.fail).toHaveBeenCalledWith(item.id, 'worker-1', {
      code: 'UNAVAILABLE',
      message: 'Proveedor no disponible',
      retryable: true,
    });
  });

  it('does not claim campaign work outside the sending window', async () => {
    const nighttime = new Date('2026-07-26T03:00:00.000Z');
    const repo = repository({ claim: vi.fn(async () => null) });
    const worker = new QueueWorker(repo, provider(), {
      now: () => nighttime,
    });

    await expect(worker.processCompany(session, 'worker-1')).resolves.toEqual({
      outcome: 'empty',
    });
    expect(repo.claim).toHaveBeenCalledWith(session.company_id, 'worker-1', false);
  });
});

describe('queue limits', () => {
  it('uses deterministic warm-up limits', () => {
    expect(dailyLimit({ ...session, connection_started_at: now.toISOString() }, now)).toBe(50);
    expect(dailyLimit(session, now)).toBe(150);
    expect(dailyLimit({ ...session, connection_started_at: '2026-07-01T00:00:00.000Z' }, now)).toBe(
      500,
    );
  });

  it('resets the in-memory daily count after 24 hours', () => {
    expect(currentDailyCount(session, now)).toBe(3);
    expect(currentDailyCount({ ...session, daily_reset_at: '2026-07-25T14:00:00.000Z' }, now)).toBe(
      0,
    );
  });

  it('evaluates the tenant timezone and bounded delay', () => {
    expect(isInsideSendingWindow(now, 'America/Lima')).toBe(true);
    expect(isInsideSendingWindow(new Date('2026-07-26T03:00:00.000Z'), 'America/Lima')).toBe(false);
    expect(randomDelayMs(1_000, 3_000, () => 0.5)).toBe(2_000);
  });
});
