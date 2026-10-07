import { NextFunction, Request, Response } from 'express';

// The helmet defaults that matter for a JSON-only API, without the dependency; the API serves no HTML, so CSP denies everything.
const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'"],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  // same-site, not same-origin: the web app on another localhost port must still read responses.
  ['Cross-Origin-Resource-Policy', 'same-site'],
  ['Origin-Agent-Cluster', '?1'],
  ['Referrer-Policy', 'no-referrer'],
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-DNS-Prefetch-Control', 'off'],
  ['X-Download-Options', 'noopen'],
  ['X-Frame-Options', 'DENY'],
  ['X-Permitted-Cross-Domain-Policies', 'none'],
  ['X-XSS-Protection', '0'],
];

export function securityHeadersMiddleware(_request: Request, response: Response, next: NextFunction): void {
  for (const [name, value] of SECURITY_HEADERS) {
    response.setHeader(name, value);
  }
  next();
}
