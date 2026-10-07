import { HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestRejectedError } from '../common/domain-errors';

type BodyParserFailure = { type: string; status: number };
type BodyRejection = { statusCode: HttpStatus; message: string };

// Fixed messages only: body-parser's own messages can quote fragments of the rejected body.
const BODY_REJECTIONS: Readonly<Record<string, BodyRejection>> = {
  'entity.too.large': { statusCode: HttpStatus.PAYLOAD_TOO_LARGE, message: 'Request body exceeds the size limit' },
  'entity.parse.failed': { statusCode: HttpStatus.BAD_REQUEST, message: 'Malformed JSON body' },
  'charset.unsupported': { statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE, message: 'Unsupported body charset' },
  'encoding.unsupported': { statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE, message: 'Unsupported body encoding' },
};
const GENERIC_BODY_REJECTION: BodyRejection = { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid request body' };

// body-parser raises http-errors carrying a string `type`; nothing else in the pipeline sets one.
function isBodyParserFailure(error: unknown): error is BodyParserFailure {
  if (typeof error !== 'object' || error === null || !('type' in error) || !('status' in error)) {
    return false;
  }
  const { type, status } = error;
  return typeof type === 'string' && typeof status === 'number' && status >= HttpStatus.BAD_REQUEST && status < HttpStatus.INTERNAL_SERVER_ERROR;
}

// Registered directly after the body parser so its failures reach the global filter as typed client errors
// instead of an internal 500 (oversized body) or a BadRequest echoing the parser message (malformed JSON).
export function bodyParserErrorsMiddleware(error: unknown, _request: Request, _response: Response, next: NextFunction): void {
  if (!isBodyParserFailure(error)) {
    next(error);
    return;
  }
  const rejection = BODY_REJECTIONS[error.type] ?? GENERIC_BODY_REJECTION;
  next(new RequestRejectedError('validation', rejection.statusCode, rejection.message));
}
