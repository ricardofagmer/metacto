import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { CORRELATION_ID_HEADER, ERROR_HTTP_STATUS, ErrorCode, ErrorEnvelope, IntelligenceUnavailableError } from '@fis/shared';
import { DomainError, RequestRejectedError } from './domain-errors';
import { appLogger } from './json-logger';
import { currentCorrelationId } from './request-context';

const INTERNAL_MESSAGE = 'An unexpected error occurred';
const DEPENDENCY_MESSAGE = 'The AI provider is unavailable; retry later';
const UNAVAILABLE_CORRELATION_ID = 'unavailable';

type ClassifiedError = { code: ErrorCode; statusCode: number; message: string };

// Framework-raised HTTP errors (unknown route, malformed JSON, oversized body) are folded into the stable taxonomy.
function classifyHttpException(exception: HttpException): ClassifiedError {
  const statusCode = exception.getStatus();
  if (statusCode === HttpStatus.NOT_FOUND) {
    return { code: 'not_found', statusCode, message: exception.message };
  }
  if (statusCode === HttpStatus.CONFLICT) {
    return { code: 'conflict', statusCode, message: exception.message };
  }
  if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
    return { code: 'rate_limited', statusCode, message: exception.message };
  }
  if (statusCode >= HttpStatus.BAD_REQUEST && statusCode < HttpStatus.INTERNAL_SERVER_ERROR) {
    return { code: 'validation', statusCode: ERROR_HTTP_STATUS.validation, message: exception.message };
  }
  return { code: 'internal', statusCode: ERROR_HTTP_STATUS.internal, message: INTERNAL_MESSAGE };
}

function classify(exception: unknown): ClassifiedError {
  if (exception instanceof RequestRejectedError) {
    return { code: exception.code, statusCode: exception.statusCode, message: exception.message };
  }
  if (exception instanceof DomainError) {
    return { code: exception.code, statusCode: ERROR_HTTP_STATUS[exception.code], message: exception.message };
  }
  if (exception instanceof IntelligenceUnavailableError) {
    return { code: 'dependency', statusCode: ERROR_HTTP_STATUS.dependency, message: DEPENDENCY_MESSAGE };
  }
  if (exception instanceof HttpException) {
    return classifyHttpException(exception);
  }
  return { code: 'internal', statusCode: ERROR_HTTP_STATUS.internal, message: INTERNAL_MESSAGE };
}

// The async context can be lost across body-stream callbacks; the header set by the correlation middleware is the fallback.
function resolveCorrelationId(response: Response): string {
  const fromContext = currentCorrelationId();
  if (fromContext !== undefined) {
    return fromContext;
  }
  const fromHeader = response.getHeader(CORRELATION_ID_HEADER);
  return typeof fromHeader === 'string' ? fromHeader : UNAVAILABLE_CORRELATION_ID;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const classified = classify(exception);
    const correlationId = resolveCorrelationId(response);

    if (classified.code === 'internal' || classified.code === 'dependency') {
      // Full detail stays server-side; the client only sees the stable code and a generic message.
      appLogger.event('error', 'http.error', {
        correlationId,
        code: classified.code,
        errorName: exception instanceof Error ? exception.name : typeof exception,
        errorMessage: exception instanceof Error ? exception.message : undefined,
        stack: exception instanceof Error ? exception.stack : undefined,
        capability: exception instanceof IntelligenceUnavailableError ? exception.capability : undefined,
        provider: exception instanceof IntelligenceUnavailableError ? exception.provider : undefined,
      });
    }
    if (exception instanceof RequestRejectedError) {
      appLogger.event('warn', 'http.request_rejected', { correlationId, code: classified.code, statusCode: classified.statusCode });
    }

    const envelope: ErrorEnvelope = {
      statusCode: classified.statusCode,
      code: classified.code,
      message: classified.message,
      correlationId,
    };
    response.status(classified.statusCode).json(envelope);
  }
}
