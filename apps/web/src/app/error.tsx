'use client';

import { Button } from '@/components/ui/button';

type ErrorBoundaryProps = { error: Error & { digest?: string }; reset: () => void };

// Last-resort boundary: expected API failures render inline with their correlation id instead of throwing.
export default function RouteError({ error, reset }: ErrorBoundaryProps) {
  return (
    <div role="alert" className="rounded-card border border-danger bg-danger-soft p-5 text-sm">
      <p className="font-semibold text-danger">Something went wrong while rendering this page.</p>
      {error.digest !== undefined ? (
        <p className="mt-2 text-xs text-fg-muted">
          Reference: <code className="select-all">{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-3">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
