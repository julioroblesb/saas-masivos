import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..', '..');

describe('collections and visit history stay linked', () => {
  it('does not truncate the tenant history to the old 50-row window', () => {
    const source = readFileSync(
      resolve(repoRoot, 'apps/web/src/app/dashboard/atenciones/actions.ts'),
      'utf8',
    );

    expect(source).not.toContain('visitsQuery.limit(50)');
    expect(source).toContain('visitsQuery.limit(1000)');
  });

  it('marks completed visits with a remaining balance as pending collection', () => {
    const source = readFileSync(
      resolve(repoRoot, 'apps/web/src/app/dashboard/atenciones/AtencionesManager.tsx'),
      'utf8',
    );

    expect(source).toContain("'Pendiente de cobro'");
    expect(source).toContain('isCompletado && saldo > 0');
  });
});
