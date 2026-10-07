import type { ApiFailure } from './http';

export type FailureSummary = {
  message: string;
  code: string;
  correlationId: string | null;
};

export function summarizeFailure(failure: ApiFailure): FailureSummary {
  switch (failure.kind) {
    case 'envelope':
      return {
        message: failure.envelope.message,
        code: failure.envelope.code,
        correlationId: failure.envelope.correlationId,
      };
    case 'invalid_response':
      return { message: failure.message, code: 'invalid_response', correlationId: failure.correlationId };
    case 'network':
      return { message: failure.message, code: 'network', correlationId: null };
  }
}

export function isConflict(failure: ApiFailure): boolean {
  return failure.kind === 'envelope' && failure.envelope.code === 'conflict';
}
