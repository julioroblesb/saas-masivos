import { describe, expect, it, vi } from 'vitest';
import { EvolutionApiError, EvolutionWhatsAppProvider, extractEvolutionQr } from './client';

const config = {
  apiUrl: 'https://evolution.example.test',
  apiKey: 'api-key-that-is-long-enough',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('EvolutionWhatsAppProvider', () => {
  it('normalizes supported QR payload shapes', () => {
    expect(extractEvolutionQr({ base64: 'qr-first-level' })).toBe('qr-first-level');
    expect(extractEvolutionQr({ qrcode: { code: 'qr-nested' } })).toBe('qr-nested');
    expect(extractEvolutionQr({ unsafe: true })).toBeNull();
  });

  it('returns a typed connection state and sends authentication headers', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ instance: { state: 'open' } }));
    const provider = new EvolutionWhatsAppProvider({
      fetcher: fetchMock as typeof fetch,
      loadConfig: () => config,
    });

    await expect(provider.getConnectionState('company_123')).resolves.toEqual({
      state: 'open',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://evolution.example.test/instance/connectionState/company_123',
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: config.apiKey,
        }),
      }),
    );
  });

  it('retries only safe reads after a transient provider failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ state: 'connecting' }));
    const sleep = vi.fn(async () => undefined);
    const provider = new EvolutionWhatsAppProvider({
      fetcher: fetchMock as typeof fetch,
      loadConfig: () => config,
      sleep,
    });

    await expect(provider.getConnectionState('company_123')).resolves.toEqual({
      state: 'connecting',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('does not retry message sends that could duplicate delivery', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 503));
    const provider = new EvolutionWhatsAppProvider({
      fetcher: fetchMock as typeof fetch,
      loadConfig: () => config,
    });

    await expect(provider.sendText('company_123', '51999999999', 'Hola')).rejects.toMatchObject({
      code: 'UNAVAILABLE',
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects incompatible provider responses without exposing their body', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ unexpected: true }));
    const provider = new EvolutionWhatsAppProvider({
      fetcher: fetchMock as typeof fetch,
      loadConfig: () => config,
    });

    await expect(provider.sendText('company_123', '51999999999', 'Hola')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      message: 'Evolution API devolvió una respuesta incompatible',
    });
  });

  it('opens the circuit after repeated transient failures', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 503));
    const provider = new EvolutionWhatsAppProvider({
      fetcher: fetchMock as typeof fetch,
      loadConfig: () => config,
      maxReadAttempts: 1,
      now: () => 1_000,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(provider.getConnectionState('company_123')).rejects.toBeInstanceOf(
        EvolutionApiError,
      );
    }

    await expect(provider.getConnectionState('company_123')).rejects.toMatchObject({
      code: 'CIRCUIT_OPEN',
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
