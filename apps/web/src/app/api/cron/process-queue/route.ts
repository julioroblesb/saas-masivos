export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { evolution } from '@/integrations/evolution/client';
import { QueueRepository } from '@/server/queue/queue-repository';
import { QueueWorker, type QueueSession } from '@/server/queue/queue-worker';
import { bearerToken, secretsMatch } from '@/server/security/secrets';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

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
  const runId = crypto.randomUUID();

  try {
    const { data: sessions, error } = await database
      .from('wa_sessions')
      .select(
        'company_id, bb_project_id, next_allowed_send_at, connection_started_at, daily_sent_count, daily_reset_at, companies!inner(status, subscription_end_at)',
      )
      .eq('status', 'conectado')
      .eq('companies.status', 'activa')
      .gte('companies.subscription_end_at', new Date().toISOString());
    if (error) throw error;

    const queueSessions: QueueSession[] = (sessions ?? []).map((session) => ({
      bb_project_id: session.bb_project_id,
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

    return NextResponse.json({
      runId,
      companiesEvaluated: queueSessions.length,
      results,
    });
  } catch (error: unknown) {
    console.error('Queue wake-up failed', {
      runId,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'No se pudo procesar la cola', runId }, { status: 500 });
  }
}
