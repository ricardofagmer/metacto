import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  correlationId: string;
};

// AsyncLocalStorage lets the logger and the exception filter reach the correlation id without threading it through every call.
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function currentCorrelationId(): string | undefined {
  return requestContextStorage.getStore()?.correlationId;
}
