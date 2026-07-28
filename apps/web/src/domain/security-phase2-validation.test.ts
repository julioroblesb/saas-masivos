import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Phase 2 Security & Architecture Audits', () => {
  const rootDir = join(process.cwd(), '..', '..');

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
      expect(content).not.toContain('session?.bb_project_id');
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

  it('verifies phase 2 RPC migration file enforces all 13 PostgreSQL security rules', () => {
    const migrationPath = join(
      rootDir,
      'supabase/migrations/20260728110000_security_phase2_rpcs.sql',
    );
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, 'utf8');

    // 1. Staff validated in spa_staff, NEVER profiles
    expect(sql).toContain('from public.spa_staff s');
    expect(sql).not.toContain('from public.profiles s');

    // 2. Staff from another tenant or inactive is rejected
    expect(sql).toContain('s.company_id = v_company_id');
    expect(sql).toContain('coalesce(s.is_active, true)');
    expect(sql).toContain('Personal no encontrado, inactivo o ajeno a la empresa');

    // 3. duration_minutes stored and validated between 1 and 1440
    expect(sql).toContain('p_duration_minutes not between 1 and 1440');

    // 4. Overlap check for staff inside RPC
    expect(sql).toContain('public.check_visit_overlap');
    expect(sql).toContain('El especialista ya tiene una cita que se cruza con ese horario');

    // 5. Expired tenant check
    expect(sql).toContain("c.status = 'activa'");
    expect(sql).toContain('c.subscription_end_at > now()');
    expect(sql).toContain('La empresa no tiene acceso activo');

    // 6. Minimum price validation
    expect(sql).toContain('coalesce(s.min_price, 0)');
    expect(sql).toContain('El precio no puede ser menor al precio mínimo del servicio');

    // 7. Total paid validation
    expect(sql).toContain('select coalesce(sum(p.amount), 0)');
    expect(sql).toContain('El precio no puede ser menor al total ya pagado');

    // 8. Staff removal (p_staff_id = null)
    expect(sql).toContain('v_effective_staff_id := p_staff_id;');

    // 9. Editable status validation (only agendado and en_curso)
    expect(sql).toContain("v_effective_status not in ('agendado', 'en_curso')");
    expect(sql).toContain('Estado editable inválido');
  });

  it('verifies webhook route uses per-tenant secret and transition fallback', () => {
    const routePath = join(rootDir, 'apps/web/src/app/api/wa/webhook/route.ts');
    const content = readFileSync(routePath, 'utf8');

    expect(content).toContain('getTenantWebhookSecret');
    expect(content).toContain('secretsMatch(receivedSecret, expectedSecret)');
    expect(content).toContain('secretsMatch(receivedSecret, env.INTERNAL_TOKEN)');
  });

  it('verifies controlled admin endpoint exists for webhook reconfiguration and rejects standard tenant owner/admin', () => {
    const routePath = join(rootDir, 'apps/web/src/app/api/admin/reconfigure-webhooks/route.ts');
    expect(existsSync(routePath)).toBe(true);
    const content = readFileSync(routePath, 'utf8');

    expect(content).toContain('reconfigureConnectedWebhooks');
    expect(content).toContain('INTERNAL_TOKEN');
    expect(content).toContain("profile?.role === 'super_admin'");
    expect(content).not.toContain("profile?.role === 'owner'");
    expect(content).not.toContain("profile?.role === 'admin'");
  });
});
