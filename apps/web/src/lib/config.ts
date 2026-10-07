import { API_PREFIX } from '@fis/shared';

const DEFAULT_API_ORIGIN = 'http://localhost:3001';
const TRAILING_SLASHES = /\/+$/;

// Accepts both an origin and an origin that already carries the version prefix (.env.example ships the latter).
function resolveApiBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(TRAILING_SLASHES, '');
  const origin = trimmed === '' ? DEFAULT_API_ORIGIN : trimmed;
  return origin.endsWith(API_PREFIX) ? origin : `${origin}${API_PREFIX}`;
}

// Read once at module load; NEXT_PUBLIC_ values are inlined into the client bundle at build time.
export const API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export const API_TIMEOUT_MS = 15_000;
// AI-backed endpoints call a model; they get a longer budget than plain reads.
export const AI_TIMEOUT_MS = 60_000;
