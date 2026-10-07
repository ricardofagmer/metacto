import type { ApiFailure } from '@/lib/http';
import { summarizeFailure } from '@/lib/failure';

type InlineFailureProps = { failure: ApiFailure; prefix?: string };

// Compact error for a failed action inside a card; full-page failures use ErrorState.
export function InlineFailure({ failure, prefix }: InlineFailureProps) {
  const summary = summarizeFailure(failure);
  return (
    <p role="alert" className="text-xs text-danger">
      {prefix !== undefined ? `${prefix} ` : ''}
      {summary.message}
      {summary.correlationId !== null ? (
        <span className="text-fg-muted">
          {' '}
          (correlation id <code className="select-all">{summary.correlationId}</code>)
        </span>
      ) : null}
    </p>
  );
}
