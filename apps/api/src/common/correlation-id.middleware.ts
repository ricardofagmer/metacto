import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '@fis/shared';
import { requestContextStorage } from './request-context';

// An inbound id is echoed into logs and responses, so it is bounded to a safe token shape.
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function resolveCorrelationId(request: Request): string {
  const inbound = request.header(CORRELATION_ID_HEADER);
  if (inbound !== undefined && CORRELATION_ID_PATTERN.test(inbound)) {
    return inbound;
  }
  return randomUUID();
}

export function correlationIdMiddleware(request: Request, response: Response, next: NextFunction): void {
  const correlationId = resolveCorrelationId(request);
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  requestContextStorage.run({ correlationId }, next);
}

// Body-stream callbacks run outside the request's async context, so it is re-entered after the body parser.
export function restoreRequestContextMiddleware(_request: Request, response: Response, next: NextFunction): void {
  const correlationId = response.getHeader(CORRELATION_ID_HEADER);
  if (typeof correlationId !== 'string') {
    next();
    return;
  }
  requestContextStorage.run({ correlationId }, next);
}
