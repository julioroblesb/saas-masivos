import { getEnv } from '@/config/env';

function isPrivateOrLoopbackHost(host: string): boolean {
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local')
  ) {
    return true;
  }

  const ipMatch = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipMatch) {
    const o1 = Number(ipMatch[1]);
    const o2 = Number(ipMatch[2]);
    const o3 = Number(ipMatch[3]);
    const o4 = Number(ipMatch[4]);

    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return true;

    if (o1 === 10) return true; // 10.0.0.0/8
    if (o1 === 127) return true; // 127.0.0.0/8
    if (o1 === 169 && o2 === 254) return true; // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (o1 === 0) return true;
  }

  if (host.includes('[')) return true; // IPv6 literal
  return false;
}

/**
 * Validates that a media URL strictly matches the trusted Supabase Storage allowlist for the given tenant:
 * 1. HTTPS only.
 * 2. Host matches configured Supabase Storage host (FAILS CLOSED if NEXT_PUBLIC_SUPABASE_URL is unconfigured).
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

  if (isPrivateOrLoopbackHost(host)) {
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

  // Fail closed if allowedHost is missing or host does not match allowedHost
  if (!allowedHost || host !== allowedHost) {
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
