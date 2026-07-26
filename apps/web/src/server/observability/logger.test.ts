import { describe, expect, it } from 'vitest';
import { redact } from './logger';

describe('structured logger redaction', () => {
  it('removes nested secrets and contact data while preserving trace context', () => {
    expect(
      redact({
        correlationId: 'trace-1',
        tenantId: 'tenant-1',
        nested: {
          authorization: 'Bearer secret',
          email: 'person@example.com',
          apiKey: 'secret',
        },
      }),
    ).toEqual({
      correlationId: 'trace-1',
      tenantId: 'tenant-1',
      nested: {
        authorization: '[REDACTED]',
        email: '[REDACTED]',
        apiKey: '[REDACTED]',
      },
    });
  });

  it('serializes errors without leaking arbitrary fields', () => {
    expect(redact(new Error('provider unavailable'))).toMatchObject({
      name: 'Error',
      message: 'provider unavailable',
    });
  });
});
