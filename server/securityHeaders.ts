/**
 * Single source of truth for HTTP security headers.
 * Emitted as `dist/_headers` for Netlify at build time and applied by `vite preview`,
 * so the CSP that ships is the CSP that was tested locally.
 */

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://image.tmdb.org",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.youtube-nocookie.com',
  "media-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** Hashed build assets never change, so they can be cached forever. */
export const IMMUTABLE_ASSET_CACHE = 'public, max-age=31536000, immutable';

export function renderNetlifyHeaders(): string {
  const block = (path: string, headers: Record<string, string>) =>
    [path, ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`)].join('\n');
  return `${[block('/*', SECURITY_HEADERS), block('/assets/*', { 'Cache-Control': IMMUTABLE_ASSET_CACHE })].join('\n\n')}\n`;
}
