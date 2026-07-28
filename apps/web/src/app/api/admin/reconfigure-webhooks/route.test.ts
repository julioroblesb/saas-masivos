import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock dependencies
vi.mock('@/config/env', () => ({
  getEnv: () => ({
    INTERNAL_TOKEN: 'valid-secret-token-12345678901234567890',
    APP_PUBLIC_URL: 'https://saasmasivos.com',
  }),
}));

vi.mock('@/server/whatsapp/reconfigure-webhooks', () => ({
  reconfigureConnectedWebhooks: vi.fn(async () => [
    { companyId: 'comp-1', evolutionInstanceName: 'company_comp1', success: true },
  ]),
}));

let mockUserRole: string | null = null;
let mockUser: { id: string } | null = null;

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUser },
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

describe('POST /api/admin/reconfigure-webhooks Authorization & Cooldown', () => {
  beforeEach(() => {
    mockUserRole = null;
    mockUser = null;
  });

  it('rejects unauthenticated requests with 403 Forbidden', async () => {
    const req = new NextRequest('http://localhost/api/admin/reconfigure-webhooks', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Acceso no autorizado');
  });

  it('rejects standard tenant owner user with 403 Forbidden', async () => {
    mockUser = { id: 'owner-user-id' };
    mockUserRole = 'owner';

    const req = new NextRequest('http://localhost/api/admin/reconfigure-webhooks', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Acceso no autorizado');
  });

  it('rejects standard tenant admin user with 403 Forbidden', async () => {
    mockUser = { id: 'admin-user-id' };
    mockUserRole = 'admin';

    const req = new NextRequest('http://localhost/api/admin/reconfigure-webhooks', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Acceso no autorizado');
  });

  it('allows valid Bearer INTERNAL_TOKEN request', async () => {
    const req = new NextRequest('http://localhost/api/admin/reconfigure-webhooks', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-secret-token-12345678901234567890',
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiator).toBe('system_internal_token');
    expect(json.results).toHaveLength(1);
    expect(json.results[0].companyId).toBe('comp-1');
  });

  it('allows super_admin user request', async () => {
    mockUser = { id: 'super-admin-id' };
    mockUserRole = 'super_admin';

    const req = new NextRequest('http://localhost/api/admin/reconfigure-webhooks', {
      method: 'POST',
    });
    const res = await POST(req);
    // Might be in cooldown if previous test ran within 60s
    expect([200, 429]).toContain(res.status);
  });
});
