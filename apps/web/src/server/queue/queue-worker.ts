import 'server-only';

import { EvolutionApiError } from '@/integrations/evolution/client';
import type { WhatsAppProvider } from '@/integrations/whatsapp/provider';
import { resolveSpintax } from '@/shared/utils/spintax';
import type { QueueRepositoryPort } from './queue-repository';

export interface QueueSession {
  bb_project_id: string | null;
  company_id: string;
  connection_started_at: string | null;
  daily_reset_at: string | null;
  daily_sent_count: number | null;
  next_allowed_send_at: string | null;
}

export type QueueWorkResult =
  | { outcome: 'deferred'; reason: string }
  | { outcome: 'empty' }
  | { outcome: 'failed'; queueId: string; state: string | null }
  | { outcome: 'sent'; queueId: string; providerMessageId: string | null };

interface QueueWorkerOptions {
  now?: () => Date;
  random?: () => number;
}

export class QueueWorker {
  private readonly now: () => Date;
  private readonly random: () => number;

  constructor(
    private readonly repository: QueueRepositoryPort,
    private readonly provider: WhatsAppProvider,
    options: QueueWorkerOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
  }

  async processCompany(session: QueueSession, workerId: string): Promise<QueueWorkResult> {
    if (!session.bb_project_id) {
      return { outcome: 'deferred', reason: 'missing_instance' };
    }

    const now = this.now();
    if (session.next_allowed_send_at && new Date(session.next_allowed_send_at) > now) {
      return { outcome: 'deferred', reason: 'rate_limited' };
    }

    const allowCampaign =
      isInsideSendingWindow(now, 'America/Lima') &&
      currentDailyCount(session, now) < dailyLimit(session, now);
    const item = await this.repository.claim(session.company_id, workerId, allowCampaign);
    if (!item) return { outcome: 'empty' };

    const marked = await this.repository.markProcessing(item.id, workerId);
    if (!marked) {
      return { outcome: 'deferred', reason: 'lease_lost' };
    }

    let nextAllowedSendAt = new Date(now.getTime() + 30_000);
    try {
      const context = await this.repository.messageContext(item);
      const delayMs =
        item.delay_after_ms ??
        randomDelayMs(
          context.minDelaySeconds * 1_000,
          context.maxDelaySeconds * 1_000,
          this.random,
        );
      nextAllowedSendAt = new Date(this.now().getTime() + delayMs);
      const message = resolveSpintax(item.message, context.settings);
      const receipt = item.media_url
        ? await this.provider.sendMedia(session.bb_project_id, item.phone, item.media_url, message)
        : await this.provider.sendText(session.bb_project_id, item.phone, message);

      const completed = await this.repository.complete(
        item.id,
        workerId,
        receipt.providerMessageId,
      );
      if (!completed) {
        throw new QueueCompletionError();
      }

      await this.repository.recordSuccess(session.company_id, nextAllowedSendAt);
      return {
        outcome: 'sent',
        queueId: item.id,
        providerMessageId: receipt.providerMessageId,
      };
    } catch (error: unknown) {
      if (error instanceof QueueCompletionError) {
        throw error;
      }

      const failure = queueFailure(error);
      const state = await this.repository.fail(item.id, workerId, failure);
      await this.repository.recordFailure(session.company_id, nextAllowedSendAt, failure.message);
      return { outcome: 'failed', queueId: item.id, state };
    }
  }
}

export function dailyLimit(session: QueueSession, now: Date): number {
  const startedAt = session.connection_started_at ? new Date(session.connection_started_at) : now;
  const activeDays = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 86_400_000));

  if (activeDays <= 2) return 50;
  if (activeDays <= 6) return 150;
  if (activeDays <= 13) return 300;
  return 500;
}

export function currentDailyCount(session: QueueSession, now: Date): number {
  const resetAt = session.daily_reset_at ? new Date(session.daily_reset_at) : null;
  if (!resetAt || now.getTime() - resetAt.getTime() >= 86_400_000) return 0;
  return session.daily_sent_count ?? 0;
}

export function isInsideSendingWindow(date: Date, timezone: string): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(date),
  );
  return hour >= 8 && hour < 20;
}

export function randomDelayMs(
  min: number,
  max: number,
  random: () => number = Math.random,
): number {
  if (max <= min) return Math.max(0, min);
  return Math.round(min + random() * (max - min));
}

function queueFailure(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof EvolutionApiError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  return {
    code: 'WORKER_ERROR',
    message: error instanceof Error ? error.message : 'Error interno del worker',
    retryable: false,
  };
}

class QueueCompletionError extends Error {
  constructor() {
    super('El proveedor aceptó el mensaje, pero el lease venció antes de confirmar');
    this.name = 'QueueCompletionError';
  }
}
