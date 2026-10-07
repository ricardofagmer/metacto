import { ErrorCode } from '@fis/shared';

// Typed failures thrown by services; the global filter maps `code` to the HTTP status in ERROR_HTTP_STATUS.
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super('not_found', `${resource} ${id} was not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('conflict', message);
    this.name = 'ConflictError';
  }
}

export class RequestValidationError extends DomainError {
  constructor(message: string) {
    super('validation', message);
    this.name = 'RequestValidationError';
  }
}

// Transport-level rejections (media type, body size/shape, rate limit) whose HTTP status is not the code's default.
// They are expected client mistakes, so the filter logs them at warn without a stack.
export class RequestRejectedError extends DomainError {
  constructor(
    code: ErrorCode,
    readonly statusCode: number,
    message: string,
  ) {
    super(code, message);
    this.name = 'RequestRejectedError';
  }
}
