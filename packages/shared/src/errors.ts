import { z } from 'zod';

export const ErrorCode = z.enum([
  'validation',
  'auth',
  'not_found',
  'conflict',
  'rate_limited',
  'dependency',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

// `auth` and `rate_limited` are reserved: nothing emits them while auth and rate limiting are out of scope.
export const ERROR_HTTP_STATUS = {
  validation: 400,
  auth: 401,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  dependency: 503,
  internal: 500,
} as const satisfies Record<ErrorCode, number>;

export const ErrorEnvelope = z.object({
  statusCode: z.number().int(),
  code: ErrorCode,
  message: z.string(),
  correlationId: z.string(),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const CORRELATION_ID_HEADER = 'x-correlation-id';
