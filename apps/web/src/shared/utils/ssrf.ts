import { getEnv } from '@/config/env';

/**
 * Validates that a media URL strictly matches the trusted Supabase Storage allowlist for the given tenant:
 * 1. HTTPS only.
 * 2. Host matches configured Supabase Storage host.
 * 3. Standard HTTPS port (empty or 443).
 * 4. No embedded username/password in URL.
 * 5. Path must belong to the 'spa-media' bucket under the tenant's exact company_id folder.
 * 6. No path traversal ('..' or encoded equivalents).
 */
export function validatePublicMediaUrl(mediaUrl: string, companyId: string): boolean {
  if (!mediaUrl || typeof mediaUrl !== 'string') return false;
  if (!companyId || typeof companyId !== 'string') return false;

  const raw = mediaUrl.trim();

  // Reject path traversal / double decoding tricks
  if (raw.includes('..') || raw.includes('%2e%2e') || raw.includes('%2E%2E')) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  // 1. Must be HTTPS
  if (parsed.protocol !== 'https:') return false;

  // 2. Reject embedded auth credentials
  if (parsed.username || parsed.password) return false;

  // 3. Reject unexpected ports
  if (parsed.port && parsed.port !== '443') return false;

  // 4. Host matching & IP literal rejection
  const host = parsed.hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.startsWith('10.') ||
    host.startsWith('169.254.') ||
    host.startsWith('192.168.') ||
    host.startsWith('172.16.') ||
    host.startsWith('172.17.') ||
    host.startsWith('172.18.') ||
    host.startsWith('172.19.') ||
    host.startsWith('172.20.') ||
    host.startsWith('172.31.') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.includes('[') ||
    host.endsWith('.local')
  ) {
    return false;
  }

  // Resolve allowed Supabase hostname from env
  let allowedHost = '';
  try {
    const env = getEnv();
    if (env.NEXT_PUBLIC_SUPABASE_URL) {
      allowedHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.toLowerCase();
    }
  } catch {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        allowedHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.toLowerCase();
      } catch {
        allowedHost = '';
      }
    }
  }

  if (allowedHost && host !== allowedHost) {
    return false;
  }

  // 5. Bucket & Tenant path matching
  const pathname = parsed.pathname;
  const rawTenant = companyId.trim();
  const cleanTenant = rawTenant.replaceAll('-', '');

  const expectedPublicPrefix1 = `/storage/v1/object/public/spa-media/${rawTenant}/`;
  const expectedPublicPrefix2 = `/storage/v1/object/public/spa-media/${cleanTenant}/`;
  const expectedSignPrefix1 = `/storage/v1/object/sign/spa-media/${rawTenant}/`;
  const expectedSignPrefix2 = `/storage/v1/object/sign/spa-media/${cleanTenant}/`;

  const matchedPrefix = [
    expectedPublicPrefix1,
    expectedPublicPrefix2,
    expectedSignPrefix1,
    expectedSignPrefix2,
  ].find((prefix) => pathname.startsWith(prefix));

  if (!matchedPrefix) {
    return false;
  }

  // Ensure path stays within tenant directory
  const subPath = pathname.slice(matchedPrefix.length);

  if (!subPath || subPath.includes('//')) {
    return false;
  }

  return true;
}
