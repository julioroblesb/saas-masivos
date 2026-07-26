import { describe, expect, it } from 'vitest';
import { bearerToken, secretsMatch } from './secrets';

describe('server secret verification', () => {
  it('accepts only an exact non-empty match', () => {
    expect(secretsMatch('secret-value', 'secret-value')).toBe(true);
    expect(secretsMatch('secret-value', 'different')).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
    expect(secretsMatch(null, 'secret-value')).toBe(false);
  });

  it('extracts a bearer token without accepting other schemes', () => {
    const request = new Request('https://example.test', {
      headers: { authorization: 'Bearer secret-value' },
    });
    const basicRequest = new Request('https://example.test', {
      headers: { authorization: 'Basic secret-value' },
    });

    expect(bearerToken(request)).toBe('secret-value');
    expect(bearerToken(basicRequest)).toBeNull();
  });
});
