import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { evolution, EvolutionApiError } from '@/integrations/evolution/client';

vi.mock('@/integrations/evolution/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/integrations/evolution/client')>();
  return {
    ...actual,
    evolution: {
      getConnectionState: vi.fn(),
      getQrCode: vi.fn(),
    },
  };
});

let mockSession: {
  evolution_instance_name: string | null;
  status: string;
  connection_started_at: string | null;
} | null = null;

const mockEq = vi.fn(async () => ({ error: null }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));

vi.mock('@/utils/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user-123' } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { company_id: 'company-123', companies: { status: 'activa' } },
          })),
          maybeSingle: vi.fn(async () => ({
            data: mockSession,
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/server/access/tenant-access-service', () => ({
  TenantAccessService: {
    forCurrentUser: vi.fn(async () => ({ allowed: true, state: 'active' })),
  },
}));

describe('GET /api/wa/status Resilience & Disconnected Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 200 disconnected immediately without calling Evolution API when session is disconnected', async () => {
    mockSession = {
      evolution_instance_name: 'company_12345',
      status: 'desconectado',
      connection_started_at: null,
    };

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('desconectado');
    expect(json.evo_state).toBe('close');
    expect(json.qr).toBeNull();

    // Evolution API must NOT be called
    expect(evolution.getConnectionState).not.toHaveBeenCalled();
  });

  it('cleans up session via Supabase Admin and returns 200 disconnected when Evolution returns 404', async () => {
    mockSession = {
      evolution_instance_name: 'company_12345',
      status: 'esperando_qr',
      connection_started_at: null,
    };

    vi.mocked(evolution.getConnectionState).mockRejectedValueOnce(
      new EvolutionApiError('Not found', 'NOT_FOUND', 404),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('desconectado');
    expect(json.evo_state).toBe('close');

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('returns 502 for transient timeout error on an active session', async () => {
    mockSession = {
      evolution_instance_name: 'company_12345',
      status: 'conectado',
      connection_started_at: '2026-07-28T10:00:00Z',
    };

    vi.mocked(evolution.getConnectionState).mockRejectedValueOnce(
      new EvolutionApiError('Timeout', 'TIMEOUT', 504),
    );

    const res = await GET();
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.code).toBe('EVOLUTION_STATE_FETCH_FAILED');
  });

  it('returns 200 conectado when Evolution state is open', async () => {
    mockSession = {
      evolution_instance_name: 'company_12345',
      status: 'conectado',
      connection_started_at: '2026-07-28T10:00:00Z',
    };

    vi.mocked(evolution.getConnectionState).mockResolvedValueOnce({ state: 'open' });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('conectado');
    expect(json.evo_state).toBe('open');
  });

  it('fetches QR code properly when connecting', async () => {
    mockSession = {
      evolution_instance_name: 'company_12345',
      status: 'esperando_qr',
      connection_started_at: null,
    };

    vi.mocked(evolution.getConnectionState).mockResolvedValueOnce({ state: 'connecting' });
    vi.mocked(evolution.getQrCode).mockResolvedValueOnce({ qrCode: 'data:image/png;base64,mockqr' });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('esperando_qr');
    expect(json.qr).toBe('data:image/png;base64,mockqr');
  });
});
