import { HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestRejectedError } from '../common/domain-errors';

const JSON_MEDIA_TYPE = 'application/json';
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);
const UNSUPPORTED_MEDIA_TYPE_MESSAGE = `Content-Type must be ${JSON_MEDIA_TYPE}`;

// Parameters such as charset are allowed; only the media type itself is compared.
function isJsonMediaType(contentType: string | undefined): boolean {
  if (contentType === undefined) {
    return false;
  }
  const [mediaType = ''] = contentType.split(';');
  return mediaType.trim().toLowerCase() === JSON_MEDIA_TYPE;
}

// Every state-changing request must declare application/json, bodiless ones included. That header is not
// CORS-safelisted, so a cross-site form or fetch is forced into a preflight the CORS allowlist then refuses.
export function jsonContentTypeMiddleware(request: Request, _response: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(request.method) || isJsonMediaType(request.header('content-type'))) {
    next();
    return;
  }
  next(new RequestRejectedError('validation', HttpStatus.UNSUPPORTED_MEDIA_TYPE, UNSUPPORTED_MEDIA_TYPE_MESSAGE));
}
