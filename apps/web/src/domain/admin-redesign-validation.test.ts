import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { purgeDemoTenants } from '@/app/admin/actions';
import { evolution } from '@/integrations/evolution/client';
import { recordAuditEvent } from '@/server/observability/audit';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  authDeleteUser: vi.fn(),
  getUser: vi.fn(),
  profileCapture: vi.fn(),
  recordAuditEvent: vi.fn(),
  roleSingle: vi.fn(),
  rpc: vi.fn(),
  storageList: vi.fn(),
  storageRemove: vi.fn(),
  waSessionCapture: vi.fn(),
}));

vi.mock('@/integrations/evolution/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/integrations/evolution/client')>();
  return {
    ...actual,
    evolution: {
      logoutInstance: vi.fn(),
      deleteInstance: vi.fn(),
    },
  };
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mocks.roleSingle,
        })),
      })),
    })),
  })),
}));

vi.mock('@/utils/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: mocks.profileCapture,
          })),
        };
      }
      if (table === 'wa_sessions') {
        return {
          select: vi.fn(() => ({
            in: mocks.waSessionCapture,
          })),
        };
      }
      return {};
    }),
    rpc: mocks.rpc,
    storage: {
      from: vi.fn(() => ({
        list: mocks.storageList,
        remove: mocks.storageRemove,
      })),
    },
    auth: {
      admin: {
        deleteUser: mocks.authDeleteUser,
      },
    },
  })),
}));

vi.mock('@/server/observability/audit', () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

const DEMO_1 = '00000000-0000-4000-8000-000000000001';
const DEMO_2 = '00000000-0000-4000-8000-000000000002';
const REPOSITORY_ROOT = join(process.cwd(), '..', '..');
const MIGRATION_PATH = join(
  REPOSITORY_ROOT,
  'supabase/migrations/20260728130000_transactional_demo_purge_rpc.sql',
);

function storageItem(name: string, id: string | null) {
  return {
    name,
    id,
    updated_at: id ? '2026-07-28T00:00:00.000Z' : null,
    created_at: id ? '2026-07-28T00:00:00.000Z' : null,
    last_accessed_at: id ? '2026-07-28T00:00:00.000Z' : null,
    metadata: id ? {} : null,
  };
}

function authorizeSuperAdmin() {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: '00000000-0000-4000-8000-000000000099' } },
  });
  mocks.roleSingle.mockResolvedValue({
    data: { role: 'super_admin' },
  });
}

function setSuccessfulRpc(companyIds: string[]) {
  mocks.rpc.mockResolvedValue({
    data: {
      success: true,
      purged_count: companyIds.length,
      company_ids: companyIds,
    },
    error: null,
  });
}

describe('Admin demo purge security and maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.roleSingle.mockResolvedValue({ data: null });
    mocks.profileCapture.mockResolvedValue({ data: [], error: null });
    mocks.waSessionCapture.mockResolvedValue({ data: [], error: null });
    mocks.authDeleteUser.mockResolvedValue({ error: null });
    mocks.storageList.mockResolvedValue({ data: [], error: null });
    mocks.storageRemove.mockResolvedValue({ data: [], error: null });
    mocks.recordAuditEvent.mockResolvedValue(undefined);
    vi.mocked(evolution.logoutInstance).mockResolvedValue(undefined);
    vi.mocked(evolution.deleteInstance).mockResolvedValue(undefined);
    setSuccessfulRpc([DEMO_1]);
  });

  it('rejects owner and normal admin before invoking the purge RPC', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'actor-id' } } });

    mocks.roleSingle.mockResolvedValueOnce({ data: { role: 'owner' } });
    await expect(purgeDemoTenants({ companyIds: [DEMO_1] })).resolves.toEqual({
      error: 'No autorizado',
    });

    mocks.roleSingle.mockResolvedValueOnce({ data: { role: 'admin' } });
    await expect(purgeDemoTenants({ companyIds: [DEMO_1] })).resolves.toEqual({
      error: 'No autorizado',
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('stops before RPC and external cleanup when profile capture fails', async () => {
    authorizeSuperAdmin();
    mocks.profileCapture.mockResolvedValue({
      data: null,
      error: { message: 'profile read failed' },
    });

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result).toEqual({
      error: 'No se pudo preparar la captura de usuarios para la purga.',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.waSessionCapture).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
    expect(mocks.storageList).not.toHaveBeenCalled();
    expect(evolution.logoutInstance).not.toHaveBeenCalled();
    expect(evolution.deleteInstance).not.toHaveBeenCalled();
  });

  it('stops before RPC and external cleanup when WhatsApp session capture fails', async () => {
    authorizeSuperAdmin();
    mocks.waSessionCapture.mockResolvedValue({
      data: null,
      error: { message: 'session read failed' },
    });

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result).toEqual({
      error: 'No se pudo preparar la captura de sesiones de WhatsApp para la purga.',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
    expect(mocks.storageList).not.toHaveBeenCalled();
    expect(evolution.logoutInstance).not.toHaveBeenCalled();
    expect(evolution.deleteInstance).not.toHaveBeenCalled();
  });

  it('rejects an inconsistent RPC result and skips every external cleanup', async () => {
    authorizeSuperAdmin();
    mocks.profileCapture.mockResolvedValue({
      data: [{ id: 'auth-user-1', company_id: DEMO_1 }],
      error: null,
    });
    mocks.waSessionCapture.mockResolvedValue({
      data: [
        {
          company_id: DEMO_1,
          evolution_instance_name: 'demo-instance',
          status: 'conectado',
        },
      ],
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: {
        success: true,
        purged_count: 1,
        company_ids: [DEMO_2],
      },
      error: null,
    });

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result).toEqual({
      error:
        'La base de datos devolvió un resultado inconsistente. Se detuvieron las limpiezas externas.',
    });
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'superadmin.demo_tenant_purge_integrity_mismatch',
        outcome: 'failure',
        metadata: {
          requestedCount: 1,
          returnedCount: 1,
        },
      }),
    );
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
    expect(mocks.storageList).not.toHaveBeenCalled();
    expect(evolution.logoutInstance).not.toHaveBeenCalled();
    expect(evolution.deleteInstance).not.toHaveBeenCalled();
  });

  it('accepts the same RPC company IDs in a different order', async () => {
    authorizeSuperAdmin();
    setSuccessfulRpc([DEMO_2, DEMO_1]);

    const result = await purgeDemoTenants({ companyIds: [DEMO_1, DEMO_2] });

    expect(result).toEqual({
      success: true,
      databasePurged: {
        count: 2,
        companyIds: [DEMO_2, DEMO_1],
      },
      authCleanupErrors: [],
      evolutionCleanupErrors: [],
      storageCleanupErrors: [],
    });
  });

  it('reports Evolution logout and delete failures separately after DB success', async () => {
    authorizeSuperAdmin();
    mocks.waSessionCapture.mockResolvedValue({
      data: [
        {
          company_id: DEMO_1,
          evolution_instance_name: 'demo-instance',
          status: 'conectado',
        },
      ],
      error: null,
    });
    vi.mocked(evolution.logoutInstance).mockRejectedValueOnce(new Error('logout HTTP 500'));
    vi.mocked(evolution.deleteInstance).mockRejectedValueOnce(new Error('delete HTTP 503'));

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result.success).toBe(true);
    expect(result.databasePurged).toEqual({ count: 1, companyIds: [DEMO_1] });
    expect(result.evolutionCleanupErrors).toEqual([
      'Logout de demo-instance: logout HTTP 500',
      'Delete de demo-instance: delete HTTP 503',
    ]);
  });

  it('reports each Auth cleanup error without changing confirmed DB success', async () => {
    authorizeSuperAdmin();
    mocks.profileCapture.mockResolvedValue({
      data: [
        { id: 'auth-user-1', company_id: DEMO_1 },
        { id: 'auth-user-2', company_id: DEMO_1 },
      ],
      error: null,
    });
    mocks.authDeleteUser
      .mockResolvedValueOnce({ error: { message: 'user lock error' } })
      .mockResolvedValueOnce({ error: null });

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result.success).toBe(true);
    expect(mocks.authDeleteUser).toHaveBeenCalledTimes(2);
    expect(result.authCleanupErrors).toEqual(['Usuario Auth auth-user-1: user lock error']);
  });

  it('reports errors returned by storage.list', async () => {
    authorizeSuperAdmin();
    mocks.storageList.mockResolvedValue({
      data: null,
      error: { message: 'list denied' },
    });

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result.success).toBe(true);
    expect(result.storageCleanupErrors).toHaveLength(2);
    expect(result.storageCleanupErrors?.[0]).toContain('list denied');
    expect(mocks.storageRemove).not.toHaveBeenCalled();
  });

  it('reports errors returned by storage.remove', async () => {
    authorizeSuperAdmin();
    mocks.storageList.mockImplementation(async (path: string) => ({
      data: path === DEMO_1 ? [storageItem('photo.jpg', 'file-id')] : [],
      error: null,
    }));
    mocks.storageRemove.mockResolvedValue({
      data: null,
      error: { message: 'remove denied' },
    });

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result.success).toBe(true);
    expect(result.storageCleanupErrors).toEqual([
      `Storage ${DEMO_1}: error eliminando un lote: remove denied`,
    ]);
  });

  it('paginates Storage, traverses nested folders and removes only tenant-prefixed paths', async () => {
    authorizeSuperAdmin();
    const firstPage = [
      ...Array.from({ length: 99 }, (_, index) =>
        storageItem(`file-${String(index).padStart(3, '0')}.jpg`, `id-${index}`),
      ),
      storageItem('nested', null),
    ];

    mocks.storageList.mockImplementation(async (path: string, options?: { offset?: number }) => {
      const offset = options?.offset ?? 0;
      if (path === DEMO_1 && offset === 0) {
        return { data: firstPage, error: null };
      }
      if (path === DEMO_1 && offset === 100) {
        return { data: [storageItem('tail.jpg', 'tail-id')], error: null };
      }
      if (path === `${DEMO_1}/nested`) {
        return { data: [storageItem('deep.jpg', 'deep-id')], error: null };
      }
      return { data: [], error: null };
    });

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result.storageCleanupErrors).toEqual([]);
    expect(mocks.storageList).toHaveBeenCalledWith(
      DEMO_1,
      expect.objectContaining({ limit: 100, offset: 0 }),
    );
    expect(mocks.storageList).toHaveBeenCalledWith(
      DEMO_1,
      expect.objectContaining({ limit: 100, offset: 100 }),
    );
    expect(mocks.storageList).toHaveBeenCalledWith(
      `${DEMO_1}/nested`,
      expect.objectContaining({ limit: 100, offset: 0 }),
    );

    const removedPaths = mocks.storageRemove.mock.calls.flatMap((call) => {
      const paths: unknown = call[0];
      return Array.isArray(paths)
        ? paths.filter((path): path is string => typeof path === 'string')
        : [];
    });
    expect(removedPaths).toContain(`${DEMO_1}/tail.jpg`);
    expect(removedPaths).toContain(`${DEMO_1}/nested/deep.jpg`);
    expect(removedPaths.every((path) => path.startsWith(`${DEMO_1}/`))).toBe(true);
  });

  it('rejects listed paths that attempt to escape the exact tenant prefix', async () => {
    authorizeSuperAdmin();
    mocks.storageList.mockImplementation(async (path: string) => ({
      data: path === DEMO_1 ? [storageItem('../outside.txt', 'outside-id')] : [],
      error: null,
    }));

    const result = await purgeDemoTenants({ companyIds: [DEMO_1] });

    expect(result.storageCleanupErrors?.[0]).toContain(
      'se rechazó una ruta fuera del prefijo permitido',
    );
    expect(mocks.storageRemove).not.toHaveBeenCalled();
  });
});

describe('Corrected demo purge migration static validation', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  it('has the exact required SHA-256', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    expect(createHash('sha256').update(readFileSync(MIGRATION_PATH)).digest('hex')).toBe(
      '881d77341cdeeb82963f8b26e22336ceab6d31bebbdbd90a20f0a2cb0fd37341',
    );
  });

  it('locks rows without combining count(*) and FOR UPDATE', () => {
    expect(sql).toContain('perform 1');
    expect(sql).toMatch(/order by c\.id\s+for update;/i);
    expect(sql).not.toMatch(/select\s+count\(\*\)[\s\S]{0,300}for\s+update;/i);
  });

  it('uses GET DIAGNOSTICS ROW_COUNT and aggregates deleted IDs', () => {
    expect(sql).toContain('get diagnostics v_matched_count = row_count;');
    expect(sql).toMatch(/with deleted as \([\s\S]*returning c\.id[\s\S]*array_agg\(d\.id/i);
  });

  it('contains static guards for empty, oversized, null and duplicate input arrays', () => {
    expect(sql).toContain('if v_num_ids < 1 or v_num_ids > 100 then');
    expect(sql).toContain('where u.id is null');
    expect(sql).toContain('if v_unique_count <> v_num_ids then');
    expect(sql).toContain('IDs duplicados');
  });

  it('contains static authorization, real-tenant and missing-ID rejection guards', () => {
    expect(sql).toContain("v_actor_role is distinct from 'super_admin'");
    expect(sql).toContain('coalesce(c.is_demo, false) is not true');
    expect(sql).toContain('if v_matched_count <> v_num_ids then');
    expect(sql).toContain('algunas empresas no fueron encontradas');
  });

  it('requires the deleted count to exactly match the requested count', () => {
    expect(sql).toContain('if cardinality(v_purged_ids) <> v_num_ids then');
    expect(sql).toContain('La cantidad eliminada no coincide');
  });

  it('revokes execution from public, anon and authenticated, granting only service_role', () => {
    expect(sql).toMatch(
      /revoke all on function public\.rpc_purge_demo_tenants\(uuid\[\], uuid\)\s+from public, anon, authenticated;/i,
    );
    expect(sql).toMatch(
      /grant execute on function public\.rpc_purge_demo_tenants\(uuid\[\], uuid\)\s+to service_role;/i,
    );
  });
});

describe('Admin owner resolution and defensive Auth pagination', () => {
  const pageSource = readFileSync(join(REPOSITORY_ROOT, 'apps/web/src/app/admin/page.tsx'), 'utf8');
  const demoViewSource = readFileSync(
    join(REPOSITORY_ROOT, 'apps/web/src/app/admin/DemoAccountsView.tsx'),
    'utf8',
  );

  it('never falls back to profiles[0] when no owner exists', () => {
    expect(pageSource).toContain("c.profiles?.find((p) => p.role === 'owner')");
    expect(pageSource).not.toContain('|| c.profiles?.[0]');
    expect(pageSource).not.toContain('profiles[0]');
    expect(pageSource).toContain("'Sin dueño'");
    expect(pageSource).toContain('ownerId ? emailMap.get(ownerId) || null : null');
  });

  it('keeps real listUsers pagination with repeated-page and maximum-page defenses', () => {
    expect(pageSource).toContain('listUsers({ page, perPage: 1000 })');
    expect(pageSource).toContain('maxAuthPages');
    expect(pageSource).toContain('seenPageFingerprints');
    expect(pageSource).toContain('page <= maxAuthPages');
  });

  it('distinguishes confirmed database purge from Auth, Evolution and Storage incidents', () => {
    expect(demoViewSource).toContain('cuentas demo transaccionalmente de la base de datos');
    expect(demoViewSource).toContain('Incidencias Auth');
    expect(demoViewSource).toContain('Incidencias Evolution');
    expect(demoViewSource).toContain('Incidencias Storage');
  });
});
