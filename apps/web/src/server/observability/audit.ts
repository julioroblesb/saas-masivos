import 'server-only';

import type { Json } from '@/types/database.generated';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createLogger } from './logger';

interface AuditEvent {
  actorId?: string | null;
  companyId?: string | null;
  correlationId: string;
  entityId?: string | null;
  entityType?: string | null;
  eventType: string;
  metadata?: Record<string, Json | undefined>;
  outcome?: 'success' | 'failure';
}

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  const logger = createLogger({
    correlationId: event.correlationId,
    tenantId: event.companyId ?? undefined,
    operation: event.eventType,
  });
  const { error } = await getSupabaseAdmin().from('app_audit_events').insert({
    actor_id: event.actorId,
    company_id: event.companyId,
    correlation_id: event.correlationId,
    entity_id: event.entityId,
    entity_type: event.entityType,
    event_type: event.eventType,
    metadata: event.metadata ?? {},
    outcome: event.outcome ?? 'success',
  });

  if (error) {
    logger.error('audit.write_failed', { error });
    throw new Error('No se pudo registrar el evento de auditoría', { cause: error });
  }

  logger.info('audit.recorded', {
    entityId: event.entityId,
    entityType: event.entityType,
    outcome: event.outcome ?? 'success',
  });
}
