import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '../..');

function read(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

const requiredProfileFields = [
  'email',
  'document_number',
  'birthday',
  'allergies_and_conditions',
  'preferences',
  'internal_notes',
  'created_at',
  'opt_in_source',
  'customer_segment',
  'total_visits',
  'total_spent',
  'last_visit_date',
];

describe('complete client profiles across operational screens', () => {
  it('keeps Agenda range results from truncating client profiles to name and phone', () => {
    const agendaActions = read('apps/web/src/app/dashboard/agenda/actions.ts');

    for (const field of requiredProfileFields) {
      expect(agendaActions).toContain(field);
    }
    expect(agendaActions).toContain('contactsById.get(v.contact_id) ?? embeddedContact');
  });

  it('uses the complete contact record when opening a profile from Atenciones', () => {
    const attentionActions = read('apps/web/src/app/dashboard/atenciones/actions.ts');

    expect(attentionActions).toContain('contactsById.get(v.contact_id) ?? embeddedContact');
    for (const field of requiredProfileFields) {
      expect(attentionActions).toContain(field);
    }
  });

  it('backfills missing visit relationships and computes live CRM metrics', () => {
    const migration = read(
      'supabase/migrations/20260729144207_fix_complete_client_profiles.sql',
    );

    expect(migration).toContain('not exists (');
    expect(migration).toContain("existing_visit.status = 'completado'");
    expect(migration).toContain('demo-profile-backfill:payment:');
    expect(migration).toContain('create function public.rpc_get_clients_metrics()');
    expect(migration).toContain('left join lateral');
    expect(migration).toContain('visit_metrics.total_visits');
    expect(migration).toContain('visit_metrics.total_spent');
  });
});
