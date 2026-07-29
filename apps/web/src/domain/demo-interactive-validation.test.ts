import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '../..');

function read(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('interactive demo sandbox', () => {
  const migration = read(
    'supabase/migrations/20260729131354_interactive_demo_and_lead_followup.sql',
  );

  it('unblocks tenant business data but suppresses outbound WhatsApp effects', () => {
    expect(migration).toContain('drop trigger if exists enforce_demo_read_only');
    expect(migration).toContain('suppress_demo_external_side_effect');
    expect(migration).toContain('on public.crm_wa_queue');
    expect(migration).toContain('on public.wa_sessions');
    expect(migration).toContain('return null;');
  });

  it('queues the corrected explanation and the day-five commercial follow-up', () => {
    expect(migration).toContain('laceado brasileño');
    expect(migration).toContain('Este mensaje se envió automáticamente');
    expect(migration).toContain('432000');
    expect(migration).toContain('S/ {{precio_oferta}} al mes durante tus primeros 6 meses');
    expect(migration).toContain('precio regular S/ {{precio_regular}}');
  });

  it('keeps both automatic messages editable by the superadmin', () => {
    const editor = read('apps/web/src/app/admin/DemoMessageTemplatesEditor.tsx');

    expect(migration).toContain('create table if not exists public.demo_message_templates');
    expect(migration).toContain("template_key = 'immediate_info'");
    expect(migration).toContain("template_key = 'day_five_follow_up'");
    expect(editor).toContain('Mensajes automáticos de la demo');
    expect(editor).toContain('updateDemoMessageTemplate');
  });

  it('cancels the follow-up when the lead becomes a client', () => {
    expect(migration).toContain('rpc_set_demo_lead_status');
    expect(migration).toContain("p_status in ('client', 'declined')");
    expect(migration).toContain("status = 'cancelled'");
  });
});

describe('demo and landing presentation', () => {
  it('does not disable all demo pointer interactions', () => {
    const layout = read('apps/web/src/components/layouts/default-layout.tsx');
    const globals = read('apps/web/src/app/globals.css');

    expect(layout).not.toContain('demo-read-only-content');
    expect(layout).not.toContain('aria-disabled={isDemo');
    expect(globals).not.toContain('.demo-read-only-content');
  });

  it('shows the public S/ 159 plan without the old S/ 99 landing offer', () => {
    const landing = read('apps/web/src/components/landing/landing-page.tsx');

    expect(landing).toContain('S/ 159');
    expect(landing).not.toContain('S/ 99');
    expect(landing).not.toContain('primeros 10');
  });
});
