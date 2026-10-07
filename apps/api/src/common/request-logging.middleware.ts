import { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '@fis/shared';
import { appLogger } from './json-logger';

const NANOSECONDS_PER_MILLISECOND = 1_000_000n;

// Logs the path without the query string: search text is user content and stays out of logs.
export function requestLoggingMiddleware(request: Request, response: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  response.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / NANOSECONDS_PER_MILLISECOND);
    const correlationId = response.getHeader(CORRELATION_ID_HEADER);
    appLogger.event('info', 'http.request', {
      ...(typeof correlationId === 'string' ? { correlationId } : {}),
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs,
    });
  });
  next();
}
