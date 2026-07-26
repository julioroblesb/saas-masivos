export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { bearerToken, secretsMatch } from '@/server/security/secrets';
import { createLogger } from '@/server/observability/logger';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-correlation-id')?.slice(0, 128) || crypto.randomUUID();
  const logger = createLogger({ correlationId: requestId, operation: 'health.check' });
  const deep = new URL(request.url).searchParams.get('deep') === '1';

  if (!deep) {
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      { headers: { 'cache-control': 'no-store', 'x-correlation-id': requestId } },
    );
  }

  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken || !secretsMatch(bearerToken(request), internalToken)) {
    return NextResponse.json(
      { status: 'unauthorized' },
      { status: 401, headers: { 'cache-control': 'no-store', 'x-correlation-id': requestId } },
    );
  }

  const startedAt = Date.now();
  try {
    const database = getSupabaseAdmin();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
    const [queueResult, dailyResult, sessionsResult] = await Promise.all([
      database
        .from('crm_wa_queue')
        .select('status, created_at, next_attempt_at')
        .in('status', ['queued', 'leased', 'processing', 'retry_scheduled', 'failed', 'dead_letter'])
        .limit(10_000),
      database
        .from('crm_wa_queue')
        .select('status, attempt_count, created_at')
        .gte('created_at', since)
        .limit(10_000),
      database.from('wa_sessions').select('status, consecutive_errors, updated_at').limit(10_000),
    ]);

    if (queueResult.error) throw queueResult.error;
    if (dailyResult.error) throw dailyResult.error;
    if (sessionsResult.error) throw sessionsResult.error;

    const now = Date.now();
    const queue = queueResult.data ?? [];
    const daily = dailyResult.data ?? [];
    const sessions = sessionsResult.data ?? [];
    const pending = queue.filter((item) =>
      ['queued', 'leased', 'processing', 'retry_scheduled'].includes(item.status),
    );
    const oldestPendingMs = pending.reduce((oldest, item) => {
      const age = now - new Date(item.next_attempt_at || item.created_at).getTime();
      return Number.isFinite(age) ? Math.max(oldest, age) : oldest;
    }, 0);

    const deadLetter = queue.filter((item) => item.status === 'dead_letter').length;
    const degradedSessions = sessions.filter((item) => (item.consecutive_errors ?? 0) > 0).length;
    const isDegraded = deadLetter > 0 || oldestPendingMs > 15 * 60 * 1_000;
    const body = {
      status: isDegraded ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      database: { status: 'ok' },
      evolution: {
        connectedSessions: sessions.filter((item) => item.status === 'conectado').length,
        degradedSessions,
      },
      queue: {
        depth: pending.length,
        oldestPendingSeconds: Math.round(oldestPendingMs / 1000),
        failed: queue.filter((item) => item.status === 'failed').length,
        deadLetter,
        retryScheduled: queue.filter((item) => item.status === 'retry_scheduled').length,
      },
      messages24h: {
        sent: daily.filter((item) => item.status === 'sent').length,
        failed: daily.filter((item) => ['failed', 'dead_letter'].includes(item.status)).length,
        retried: daily.filter((item) => item.attempt_count > 0).length,
      },
    };
    logger.info('health.deep_ok', {
      latencyMs: body.latencyMs,
      queueDepth: body.queue.depth,
      deadLetter: body.queue.deadLetter,
      degradedSessions: body.evolution.degradedSessions,
    });

    return NextResponse.json(body, {
      status: isDegraded ? 503 : 200,
      headers: { 'cache-control': 'no-store', 'x-correlation-id': requestId },
    });
  } catch (error: unknown) {
    logger.error('health.deep_failed', { error, latencyMs: Date.now() - startedAt });
    return NextResponse.json(
      { status: 'degraded', timestamp: new Date().toISOString() },
      {
        status: 503,
        headers: { 'cache-control': 'no-store', 'x-correlation-id': requestId },
      },
    );
  }
}
