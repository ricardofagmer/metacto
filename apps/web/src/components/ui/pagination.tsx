import Link from 'next/link';

type PaginationProps = { page: number; limit: number; total: number; hrefFor: (page: number) => string };

const LINK = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-muted';
const DISABLED = 'rounded-lg border border-border px-3 py-1.5 text-sm text-fg-muted opacity-60';

export function Pagination({ page, limit, total, hrefFor }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount === 1) return null;
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4">
      {hasPrevious ? (
        <Link href={hrefFor(page - 1)} className={LINK} rel="prev">
          Previous
        </Link>
      ) : (
        <span className={DISABLED} aria-disabled="true">
          Previous
        </span>
      )}
      <p className="text-sm text-fg-muted" aria-current="page">
        Page {page} of {pageCount}
      </p>
      {hasNext ? (
        <Link href={hrefFor(page + 1)} className={LINK} rel="next">
          Next
        </Link>
      ) : (
        <span className={DISABLED} aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}
