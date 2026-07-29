import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..', '..');

describe('collections and visit history stay linked', () => {
  it('paginates the history at the database instead of loading the whole tenant history', () => {
    const source = readFileSync(
      resolve(repoRoot, 'apps/web/src/app/dashboard/atenciones/actions.ts'),
      'utf8',
    );

    expect(source).not.toContain('visitsQuery.limit(50)');
    expect(source).not.toContain('visitsQuery.limit(1000)');
    expect(source).toContain('historyVisitsQuery.range(');
    expect(source).toContain("['completado', 'cancelado', 'no_asistio']");
    expect(source).toContain("['agendado', 'en_curso']");
  });

  it('marks completed visits with a remaining balance as pending collection', () => {
    const source = readFileSync(
      resolve(repoRoot, 'apps/web/src/app/dashboard/atenciones/AtencionesManager.tsx'),
      'utf8',
    );

    expect(source).toContain("'Pendiente de cobro'");
    expect(source).toContain('isCompletado && saldo > 0');
  });

  it('loads payment movements only for the visits rendered in Cobranza', () => {
    const source = readFileSync(
      resolve(repoRoot, 'apps/web/src/app/dashboard/cobranza/page.tsx'),
      'utf8',
    );

    expect(source).toContain(".in('visit_id', debtVisitIds)");
  });

  it('loads full client profiles only for contacts visible in Agenda', () => {
    const source = readFileSync(
      resolve(repoRoot, 'apps/web/src/app/dashboard/agenda/actions.ts'),
      'utf8',
    );

    expect(source).toContain(".select('id, name, phone')");
    expect(source).toContain(".in('id', visibleContactIds)");
  });

  it('keeps tenant history and open-balance queries index-backed', () => {
    const migration = readFileSync(
      resolve(
        repoRoot,
        'supabase/migrations/20260729173942_optimize_tenant_visit_pagination.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('spa_visits_tenant_history_idx');
    expect(migration).toContain('spa_visits_tenant_operational_idx');
    expect(migration).toContain('spa_visits_tenant_open_balance_idx');
  });
});
