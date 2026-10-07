import type { ReactNode } from 'react';
import type { ApiFailure } from '@/lib/http';
import { summarizeFailure } from '@/lib/failure';

type ErrorStateProps = { title: string; failure: ApiFailure; action?: ReactNode };

export function ErrorState({ title, failure, action }: ErrorStateProps) {
  const summary = summarizeFailure(failure);
  return (
    <div role="alert" className="rounded-card border border-danger bg-danger-soft p-4 text-sm">
      <p className="font-semibold text-danger">{title}</p>
      <p className="mt-1 text-fg">{summary.message}</p>
      <p className="mt-2 text-xs text-fg-muted">
        Error code: <code>{summary.code}</code>
        {summary.correlationId !== null ? (
          <>
            {' '}
            &middot; Correlation id: <code className="select-all">{summary.correlationId}</code>
          </>
        ) : null}
      </p>
      {action !== undefined ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

type EmptyStateProps = { title: string; description: string; action?: ReactNode };

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="text-base font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">{description}</p>
      {action !== undefined ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-muted ${className ?? ''}`} />;
}

type SkeletonListProps = { rows: number; label: string };

export function SkeletonList({ rows, label }: SkeletonListProps) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-card border border-border bg-surface p-5">
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
