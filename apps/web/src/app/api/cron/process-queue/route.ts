export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { evolution } from '@/integrations/evolution/client';
import { QueueRepository } from '@/server/queue/queue-repository';
import { QueueWorker, type QueueSession } from '@/server/queue/queue-worker';
import { bearerToken, secretsMatch } from '@/server/security/secrets';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createLogger } from '@/server/observability/logger';

const CONCURRENCY = 5;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado en servidor' }, { status: 500 });
  }
  if (!secretsMatch(bearerToken(request), cronSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const database = getSupabaseAdmin();
  const repository = new QueueRepository(database);
  const worker = new QueueWorker(repository, evolution);
  const runId = request.headers.get('x-correlation-id')?.slice(0, 128) || crypto.randomUUID();
  const logger = createLogger({ correlationId: runId, operation: 'queue.run' });

  try {
    const { data: sessions, error } = await database
      .from('wa_sessions')
      .select(
        'company_id, evolution_instance_name, next_allowed_send_at, connection_started_at, daily_sent_count, daily_reset_at, companies!inner(status, subscription_end_at)',
      )
      .eq('status', 'conectado')
      .eq('companies.status', 'activa')
      .gte('companies.subscription_end_at', new Date().toISOString());
    if (error) throw error;

    const queueSessions: QueueSession[] = (sessions ?? []).map((session) => ({
      evolution_instance_name: session.evolution_instance_name,
      company_id: session.company_id,
      connection_started_at: session.connection_started_at,
      daily_reset_at: session.daily_reset_at,
      daily_sent_count: session.daily_sent_count,
      next_allowed_send_at: session.next_allowed_send_at,
    }));
    const results: Array<{
      companyId: string;
      result: unknown;
    }> = [];

    for (let offset = 0; offset < queueSessions.length; offset += CONCURRENCY) {
      const chunk = queueSessions.slice(offset, offset + CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map((session) =>
          worker.processCompany(session, `${runId}:${session.company_id}`.slice(0, 128)),
        ),
      );

      settled.forEach((result, index) => {
        results.push({
          companyId: chunk[index].company_id,
          result:
            result.status === 'fulfilled'
              ? result.value
              : {
                  outcome: 'error',
                  message:
                    result.reason instanceof Error ? result.reason.message : String(result.reason),
                },
        });
      });
    }

    const failedCompanies = results.filter(
      (item) =>
        typeof item.result === 'object' &&
        item.result !== null &&
        'outcome' in item.result &&
        item.result.outcome === 'error',
    ).length;
    logger.info('queue.run_completed', {
      companiesEvaluated: queueSessions.length,
      failedCompanies,
    });
    return NextResponse.json(
      {
        runId,
        companiesEvaluated: queueSessions.length,
        results,
      },
      { headers: { 'cache-control': 'no-store', 'x-correlation-id': runId } },
    );
  } catch (error: unknown) {
    logger.error('queue.run_failed', { error });
    return NextResponse.json(
      { error: 'No se pudo procesar la cola', runId },
      {
        status: 500,
        headers: { 'cache-control': 'no-store', 'x-correlation-id': runId },
      },
    );
  }
}
