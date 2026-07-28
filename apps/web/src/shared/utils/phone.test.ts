import { describe, expect, it } from 'vitest';
import { normalizePeruPhone, requirePeruPhone } from './phone';

describe('normalizePeruPhone', () => {
  it.each([
    ['996552871', '51996552871'],
    ['996 552 871', '51996552871'],
    ['996-552-871', '51996552871'],
    ['+51 996 552 871', '51996552871'],
    ['51996552871', '51996552871'],
    ['0051 996 552 871', '51996552871'],
    ['051 996 552 871', '51996552871'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePeruPhone(input)).toBe(expected);
  });

  it.each(['', '123456789', '51996552', '519965528710'])('rejects invalid input %s', (input) => {
    expect(normalizePeruPhone(input)).toBeNull();
  });

  it('returns a user-facing validation error', () => {
    expect(() => requirePeruPhone('123')).toThrow('9 dígitos');
  });
});
