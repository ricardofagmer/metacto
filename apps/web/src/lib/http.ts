import { CORRELATION_ID_HEADER, ErrorEnvelope } from '@fis/shared';
import type { z } from 'zod';
import { API_BASE_URL, API_TIMEOUT_MS } from './config';

// Plain data (no class instances) so a failure can cross the server/client component boundary.
export type ApiFailure =
  | { kind: 'envelope'; envelope: ErrorEnvelope }
  | { kind: 'network'; message: string }
  | { kind: 'invalid_response'; message: string; correlationId: string | null; statusCode: number };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type QueryValue = string | number | undefined;

export type RequestOptions<T> = {
  method: HttpMethod;
  path: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  query?: Record<string, QueryValue>;
  body?: unknown;
  timeoutMs?: number;
};

const ID_PLACEHOLDER = ':id';

export function routeWithId(template: string, id: string): string {
  return template.replace(ID_PLACEHOLDER, encodeURIComponent(id));
}

function buildUrl(path: string, query: Record<string, QueryValue> | undefined): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  // A body that cannot be read or parsed becomes a non-JSON payload, which every schema then rejects.
  try {
    const text = await response.text();
    if (text === '') return null;
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    return null;
  }
}

function describeNetworkError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'The API did not respond in time.';
  }
  return 'The API is unreachable. Check that it is running.';
}

function toFailure(response: Response, payload: unknown): ApiFailure {
  const envelope = ErrorEnvelope.safeParse(payload);
  if (envelope.success) return { kind: 'envelope', envelope: envelope.data };
  return {
    kind: 'invalid_response',
    message: `The API returned an unexpected error response (HTTP ${response.status}).`,
    correlationId: response.headers.get(CORRELATION_ID_HEADER),
    statusCode: response.status,
  };
}

// The API rejects non-GET requests without a JSON content type (415), which blocks cross-site
// "simple" requests; every mutation declares it, including bodiless ones such as analyze.
function buildHeaders(method: HttpMethod): Record<string, string> {
  if (method === 'GET') return { accept: 'application/json' };
  return { accept: 'application/json', 'content-type': 'application/json' };
}

export async function apiRequest<T>(options: RequestOptions<T>): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(buildUrl(options.path, options.query), {
      method: options.method,
      headers: buildHeaders(options.method),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeoutMs ?? API_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, error: { kind: 'network', message: describeNetworkError(error) } };
  }

  const payload = await readJson(response);
  if (!response.ok) return { ok: false, error: toFailure(response, payload) };

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        kind: 'invalid_response',
        message: 'The API response did not match the expected contract.',
        correlationId: response.headers.get(CORRELATION_ID_HEADER),
        statusCode: response.status,
      },
    };
  }
  return { ok: true, data: parsed.data };
}
