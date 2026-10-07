import type { ApiFailure, ApiResult } from './http';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; failure: ApiFailure }
  | { status: 'success'; data: T };

export function fromResult<T>(result: ApiResult<T>): AsyncState<T> {
  return result.ok ? { status: 'success', data: result.data } : { status: 'error', failure: result.error };
}
