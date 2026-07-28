import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteTenant, purgeDemoTenants } from '@/app/admin/actions';
import { evolution } from '@/integrations/evolution/client';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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

let mockUserRole: string | null = null;
let mockUserId: string | null = null;
let mockRpcResult: { data: unknown; error: unknown } = {
  data: { success: true, purged_count: 2, company_ids: ['demo-1', 'demo-2'] },
  error: null,
};
let mockAuthDeleteUserError: { message: string } | null = null;

const DEMO_1 = '00000000-0000-4000-8000-000000000001';
const DEMO_2 = '00000000-0000-4000-8000-000000000002';
const REAL_1 = '00000000-0000-4000-8000-000000000003';

const mockCompanyUpdateEq = vi.fn(async () => ({ error: null }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUserId ? { id: mockUserId } : null },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: mockUserRole ? { role: mockUserRole } : null,
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/utils/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'companies') {
        return {
          update: vi.fn(() => ({
            eq: mockCompanyUpdateEq,
          })),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: [{ id: 'user-demo-1', company_id: DEMO_1 }],
            })),
          })),
        };
      }
      if (table === 'wa_sessions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: [
                { company_id: DEMO_1, evolution_instance_name: 'company_demo1', status: 'conectado' },
              ],
            })),
          })),
        };
      }
      return {};
    }),
    rpc: vi.fn(async () => mockRpcResult),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(async () => ({ data: [] })),
        remove: vi.fn(async () => ({ data: [] })),
      })),
    },
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({ error: mockAuthDeleteUserError })),
        listUsers: vi.fn(async ({ page }) => {
          if (page === 1) {
            return {
              data: {
                users: Array.from({ length: 1000 }, (_, i) => ({
                  id: `user-${i}`,
                  email: `user${i}@test.com`,
                })),
              },
              error: null,
            };
          }
          return {
            data: {
              users: [{ id: 'user-1001', email: 'user1001@test.com' }],
            },
            error: null,
          };
        }),
      },
    },
  })),
}));

vi.mock('@/server/observability/audit', () => ({
  recordAuditEvent: vi.fn(async () => {}),
}));

describe('Admin Panel Transactional Purge & Observability Audits', () => {
  const rootDir = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = null;
    mockUserRole = null;
    mockAuthDeleteUserError = null;
    mockRpcResult = {
      data: { success: true, purged_count: 2, company_ids: [DEMO_1, DEMO_2] },
      error: null,
    };
  });

  it('1 & 6. rejects tenant owner and normal admin from purgeDemoTenants', async () => {
    mockUserId = 'user-owner';
    mockUserRole = 'owner';
    const resOwner = await purgeDemoTenants({ companyIds: [DEMO_1] });
    expect(resOwner).toEqual({ error: 'No autorizado' });

    mockUserId = 'user-admin';
    mockUserRole = 'admin';
    const resAdmin = await purgeDemoTenants({ companyIds: [DEMO_1] });
    expect(resAdmin).toEqual({ error: 'No autorizado' });
  });

  it('3. allows super_admin to execute purgeDemoTenants via rpc_purge_demo_tenants', async () => {
    mockUserId = 'super-admin-id';
    mockUserRole = 'super_admin';

    const res = await purgeDemoTenants({
      companyIds: [DEMO_1, DEMO_2],
    });

    expect(res.success).toBe(true);
    expect(res.databasePurged).toEqual({
      count: 2,
      companyIds: [DEMO_1, DEMO_2],
    });
    expect(res.authCleanupErrors).toEqual([]);
    expect(res.evolutionCleanupErrors).toEqual([]);
  });

  it('8. reports Evolution cleanup failures separately without marking DB purge as failed', async () => {
    mockUserId = 'super-admin-id';
    mockUserRole = 'super_admin';

    vi.mocked(evolution.deleteInstance).mockRejectedValueOnce(
      new Error('Evolution API HTTP 500 Connection error'),
    );

    const res = await purgeDemoTenants({
      companyIds: [DEMO_1],
    });

    expect(res.success).toBe(true);
    expect(res.databasePurged?.count).toBe(2);
    expect(res.evolutionCleanupErrors).toHaveLength(1);
    expect(res.evolutionCleanupErrors?.[0]).toContain('Evolution API HTTP 500');
  });

  it('7. differentiates DB purge result from Auth cleanup errors', async () => {
    mockUserId = 'super-admin-id';
    mockUserRole = 'super_admin';
    mockAuthDeleteUserError = { message: 'Auth user lock error' };

    const res = await purgeDemoTenants({
      companyIds: [DEMO_1],
    });

    expect(res.success).toBe(true);
    expect(res.databasePurged?.count).toBe(2);
    expect(res.authCleanupErrors).toHaveLength(1);
    expect(res.authCleanupErrors?.[0]).toContain('Auth user lock error');
  });

  it('5. verifies transactional RPC migration file revokes permissions from public, anon, authenticated', () => {
    const migrationPath = join(
      rootDir,
      'supabase/migrations/20260728130000_transactional_demo_purge_rpc.sql',
    );
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('create or replace function public.rpc_purge_demo_tenants');
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('for update');
    expect(sql).toContain(
      'revoke execute on function public.rpc_purge_demo_tenants(uuid[], uuid) from public, anon, authenticated;',
    );
    expect(sql).toContain(
      'grant execute on function public.rpc_purge_demo_tenants(uuid[], uuid) to service_role;',
    );
    expect(sql).toContain('array_length(p_company_ids, 1)');
    expect(sql).toContain('La lista p_company_ids contiene IDs duplicados');
    expect(sql).toContain('is_demo != true');
  });

  it('9 & 10. verifies owner resolution by role and listUsers pagination in page.tsx', () => {
    const pagePath = join(rootDir, 'apps/web/src/app/admin/page.tsx');
    expect(existsSync(pagePath)).toBe(true);
    const content = readFileSync(pagePath, 'utf8');

    expect(content).toContain("profiles(id, full_name, role)");
    expect(content).toContain("p.role === 'owner'");
    expect(content).toContain('while (hasMore)');
    expect(content).toContain('listUsers({ page, perPage: 1000 })');
  });
});
