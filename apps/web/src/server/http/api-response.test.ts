import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from './api-error';
import { correlationId, failure, parseJson, success } from './api-response';

describe('API response contract', () => {
  it('preserves a valid inbound correlation id', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-correlation-id': 'request-123' },
    });
    expect(correlationId(request)).toBe('request-123');
  });

  it('returns a stable success envelope', async () => {
    const response = success({ value: 1 }, 'request-123');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { value: 1 },
      correlationId: 'request-123',
    });
  });

  it('returns a sanitized error envelope', async () => {
    const response = failure(new ApiError(403, 'FORBIDDEN', 'No autorizado'), 'request-123');
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'No autorizado',
        correlationId: 'request-123',
      },
    });
  });

  it('validates JSON payloads with Zod', async () => {
    const request = new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Renova' }),
    });
    await expect(parseJson(request, z.object({ name: z.string().min(1) }))).resolves.toEqual({
      name: 'Renova',
    });
  });
});
