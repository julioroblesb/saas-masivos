import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Phase 2 Security & Architecture Audits', () => {
  const rootDir = process.cwd();

  it('verifies active code does not read or write bb_project_id', () => {
    const activeFiles = [
      'apps/web/src/app/api/wa/instance/route.ts',
      'apps/web/src/app/api/wa/status/route.ts',
      'apps/web/src/app/api/wa/disconnect/route.ts',
      'apps/web/src/app/api/wa/webhook/route.ts',
      'apps/web/src/app/api/cron/process-queue/route.ts',
      'apps/web/src/server/queue/queue-worker.ts',
    ];

    for (const relPath of activeFiles) {
      const fullPath = join(rootDir, relPath);
      expect(existsSync(fullPath), `File missing: ${relPath}`).toBe(true);
      const content = readFileSync(fullPath, 'utf8');

      // Active writes/queries must not use bb_project_id
      expect(content).not.toContain(".from('wa_sessions').insert({ bb_project_id");
      expect(content).not.toContain("bb_project_id:");
      expect(content).not.toContain(".eq('bb_project_id'");
    }
  });

  it('verifies wa_webhook_secrets is accessed exclusively via getSupabaseAdmin in server files', () => {
    const webhookSecretHelper = join(rootDir, 'apps/web/src/server/db/webhook-secrets.ts');
    expect(existsSync(webhookSecretHelper)).toBe(true);
    const content = readFileSync(webhookSecretHelper, 'utf8');

    expect(content).toContain("import 'server-only'");
    expect(content).toContain('getSupabaseAdmin()');
    expect(content).toContain("from('wa_webhook_secrets')");
  });

  it('verifies phase 2 RPC migration file exists and is valid', () => {
    const migrationPath = join(rootDir, 'supabase/migrations/20260728110000_security_phase2_rpcs.sql');
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('create or replace function public.rpc_create_visit');
    expect(sql).toContain('create or replace function public.rpc_update_visit');
    expect(sql).toContain('create or replace function public.rpc_reschedule_visit');
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('for update');
  });

  it('verifies webhook route uses per-tenant secret and transition fallback', () => {
    const routePath = join(rootDir, 'apps/web/src/app/api/wa/webhook/route.ts');
    const content = readFileSync(routePath, 'utf8');

    expect(content).toContain('getTenantWebhookSecret');
    expect(content).toContain('secretsMatch(receivedSecret, expectedSecret)');
    expect(content).toContain('secretsMatch(receivedSecret, env.INTERNAL_TOKEN)');
  });
});
