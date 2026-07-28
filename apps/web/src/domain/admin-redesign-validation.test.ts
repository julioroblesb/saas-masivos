import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteTenant, purgeDemoTenants } from '@/app/admin/actions';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

let mockUserRole: string | null = null;
let mockUserId: string | null = null;

const mockCompanyDeleteIn = vi.fn(async () => ({ error: null }));
const mockProfilesDeleteIn = vi.fn(async () => ({ error: null }));
const mockCompanyUpdateEq = vi.fn(async () => ({ error: null }));

const DEMO_1 = '00000000-0000-4000-8000-000000000001';
const DEMO_2 = '00000000-0000-4000-8000-000000000002';
const REAL_1 = '00000000-0000-4000-8000-000000000003';

const mockDbCompanies = [
  { id: DEMO_1, name: 'Demo Spa 1', is_demo: true, status: 'activa' },
  { id: DEMO_2, name: 'Demo Spa 2', is_demo: true, status: 'activa' },
  { id: REAL_1, name: 'Real Client Spa', is_demo: false, status: 'activa' },
];

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
          select: vi.fn(() => ({
            in: vi.fn(async (col: string, ids: string[]) => {
              const matched = mockDbCompanies.filter((c) => ids.includes(c.id));
              return { data: matched, error: null };
            }),
          })),
          delete: vi.fn(() => ({
            in: mockCompanyDeleteIn,
          })),
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
          delete: vi.fn(() => ({
            in: mockProfilesDeleteIn,
          })),
        };
      }
      if (table === 'wa_sessions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: [] })),
          })),
        };
      }
      return {};
    }),
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({ error: null })),
      },
    },
  })),
}));

vi.mock('@/server/observability/audit', () => ({
  recordAuditEvent: vi.fn(async () => {}),
}));

describe('Admin Panel Redesign & Security Audits', () => {
  const rootDir = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = null;
    mockUserRole = null;
  });

  it('1 & 2. rejects tenant owner and normal admin from purgeDemoTenants', async () => {
    mockUserId = 'user-owner';
    mockUserRole = 'owner';
    const resOwner = await purgeDemoTenants({ companyIds: [DEMO_1] });
    expect(resOwner).toEqual({ error: 'No autorizado' });

    mockUserId = 'user-admin';
    mockUserRole = 'admin';
    const resAdmin = await purgeDemoTenants({ companyIds: [DEMO_1] });
    expect(resAdmin).toEqual({ error: 'No autorizado' });
  });

  it('3 & 6. allows super_admin to purge a batch containing ONLY demo accounts', async () => {
    mockUserId = 'super-admin-id';
    mockUserRole = 'super_admin';

    const res = await purgeDemoTenants({
      companyIds: [DEMO_1, DEMO_2],
    });

    if (res.error) console.error('PURGE ERROR:', res.error);
    expect(res.success).toBe(true);
    expect(res.purgedCount).toBe(2);
    expect(mockCompanyDeleteIn).toHaveBeenCalled();
  });

  it('7. STRICT LOCK: rejects entire batch if even a single real client is included', async () => {
    mockUserId = 'super-admin-id';
    mockUserRole = 'super_admin';

    // Batch contains 1 demo and 1 REAL client
    const res = await purgeDemoTenants({
      companyIds: [DEMO_1, REAL_1],
    });

    expect(res.error).toContain('cliente real y no puede ser eliminada');
    expect(mockCompanyDeleteIn).not.toHaveBeenCalled();
  });

  it('12. Cancelar acceso for a real client does NOT delete data (only updates status to cancelada)', async () => {
    mockUserId = 'super-admin-id';
    mockUserRole = 'super_admin';

    const res = await deleteTenant(REAL_1);
    if (res.error) console.error('DELETE ERROR:', res.error);
    expect(res.success).toBe(true);
    expect(mockCompanyUpdateEq).toHaveBeenCalledWith('id', REAL_1);
    expect(mockCompanyDeleteIn).not.toHaveBeenCalled();
  });

  it('9 & 10. verifies superadmin views and actions do not expose getSupabaseAdmin to browser', () => {
    const views = [
      'apps/web/src/app/admin/RealClientsView.tsx',
      'apps/web/src/app/admin/DemoAccountsView.tsx',
      'apps/web/src/app/admin/WhatsappOversightView.tsx',
      'apps/web/src/app/admin/AdminDashboardClient.tsx',
    ];

    for (const relPath of views) {
      const fullPath = join(rootDir, relPath);
      expect(existsSync(fullPath), `File missing: ${relPath}`).toBe(true);
      const content = readFileSync(fullPath, 'utf8');

      expect(content).not.toContain('getSupabaseAdmin');
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    }
  });
});
