import type { NextConfig } from 'next';

const DEFAULT_API_ORIGIN = 'http://localhost:3001';
const ALL_ROUTES = '/:path*';
const HSTS_MAX_AGE_SECONDS = 63_072_000;

const isProduction = process.env.NODE_ENV === 'production';

// Browsers call the API directly from client components, so its origin must be allowed in connect-src.
// An unparseable NEXT_PUBLIC_API_URL throws here, failing the build instead of shipping a broken policy.
function resolveApiOrigin(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  return new URL(trimmed === '' ? DEFAULT_API_ORIGIN : trimmed).origin;
}

function buildContentSecurityPolicy(apiOrigin: string): string {
  // Nonce-free policy: the App Router streams RSC payloads and hydration bootstraps as inline scripts,
  // so script-src needs 'unsafe-inline' unless every page is rendered dynamically with a per-request nonce.
  // Dev mode additionally needs 'unsafe-eval' (React debugging) and websockets for HMR.
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"])];
  const connectSrc = ["'self'", apiOrigin, ...(isProduction ? [] : ['ws:'])];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    // React applies inline style attributes; Tailwind output is a same-origin stylesheet.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': connectSrc,
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

function buildSecurityHeaders(): { key: string; value: string }[] {
  const headers = [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(resolveApiOrigin(process.env.NEXT_PUBLIC_API_URL)) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  ];
  // HSTS over plain-http localhost would pin browsers to https for that host, so it ships only in production.
  if (isProduction) {
    headers.push({ key: 'Strict-Transport-Security', value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains` });
  }
  return headers;
}

const nextConfig: NextConfig = {
  // @fis/shared ships compiled CommonJS from a workspace package; transpiling keeps one module graph.
  transpilePackages: ['@fis/shared'],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: ALL_ROUTES, headers: buildSecurityHeaders() }];
  },
};

export default nextConfig;
