import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validatePublicMediaUrl } from './ssrf';

describe('Strict SSRF Media URL Validation (ssrf.ts)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc-xyz.supabase.co';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
  });

  it('rejects localhost and loopback IPs', () => {
    expect(validatePublicMediaUrl('https://localhost/storage/v1/object/public/spa-media/123/a.jpg', mockTenantId)).toBe(false);
    expect(validatePublicMediaUrl('https://127.0.0.1/storage/v1/object/public/spa-media/123/a.jpg', mockTenantId)).toBe(false);
    expect(validatePublicMediaUrl('http://127.0.0.1:8080/image.jpg', mockTenantId)).toBe(false);
  });

  it('rejects private IP ranges 10.x and 169.254.x cloud metadata', () => {
    expect(validatePublicMediaUrl(`https://10.0.0.1/storage/v1/object/public/spa-media/${mockTenantId}/a.jpg`, mockTenantId)).toBe(false);
    expect(validatePublicMediaUrl('https://169.254.169.254/latest/meta-data/', mockTenantId)).toBe(false);
    expect(validatePublicMediaUrl(`https://192.168.1.1/storage/v1/object/public/spa-media/${mockTenantId}/a.jpg`, mockTenantId)).toBe(false);
  });

  it('rejects external domains', () => {
    expect(validatePublicMediaUrl('https://evil.com/image.png', mockTenantId)).toBe(false);
    expect(validatePublicMediaUrl('https://attacker.org/storage/v1/object/public/spa-media/a.jpg', mockTenantId)).toBe(false);
  });

  it('rejects HTTP URLs (non-HTTPS)', () => {
    expect(validatePublicMediaUrl(`http://abc-xyz.supabase.co/storage/v1/object/public/spa-media/${mockTenantId}/a.jpg`, mockTenantId)).toBe(false);
  });

  it('rejects embedded credentials and non-443 ports', () => {
    expect(validatePublicMediaUrl(`https://user:pass@abc-xyz.supabase.co/storage/v1/object/public/spa-media/${mockTenantId}/a.jpg`, mockTenantId)).toBe(false);
    expect(validatePublicMediaUrl(`https://abc-xyz.supabase.co:8443/storage/v1/object/public/spa-media/${mockTenantId}/a.jpg`, mockTenantId)).toBe(false);
  });

  it('rejects path traversal attempts', () => {
    expect(validatePublicMediaUrl(`https://abc-xyz.supabase.co/storage/v1/object/public/spa-media/${mockTenantId}/../other/a.jpg`, mockTenantId)).toBe(false);
    expect(validatePublicMediaUrl(`https://abc-xyz.supabase.co/storage/v1/object/public/spa-media/${mockTenantId}/%2e%2e/a.jpg`, mockTenantId)).toBe(false);
  });

  it('rejects Supabase storage URLs belonging to another tenant', () => {
    const otherTenantId = '99999999-9999-9999-9999-999999999999';
    expect(validatePublicMediaUrl(`https://abc-xyz.supabase.co/storage/v1/object/public/spa-media/${otherTenantId}/a.jpg`, mockTenantId)).toBe(false);
  });

  it('accepts valid Supabase storage URL belonging to current tenant', () => {
    const validUrl = `https://abc-xyz.supabase.co/storage/v1/object/public/spa-media/${mockTenantId}/services/facial.jpg`;
    expect(validatePublicMediaUrl(validUrl, mockTenantId)).toBe(true);
  });
});
