import type { DuplicateCandidate } from '@fis/shared';
import Link from 'next/link';
import { formatPercent } from '@/lib/labels';

const SHORT_ID_LENGTH = 8;

function displayTitle(id: string, titles: Map<string, string>): string {
  return titles.get(id) ?? `Request ${id.slice(0, SHORT_ID_LENGTH)}`;
}

type DuplicateListProps = { candidates: DuplicateCandidate[]; titles: Map<string, string> };

export function DuplicateList({ candidates, titles }: DuplicateListProps) {
  if (candidates.length === 0) return <p className="text-sm text-fg-muted">No likely duplicates were found.</p>;
  return (
    <ul className="space-y-2">
      {candidates.map((candidate) => (
        <li key={candidate.id} className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link href={`/requests/${candidate.id}`} className="text-sm font-medium text-fg hover:underline">
              {displayTitle(candidate.id, titles)}
            </Link>
            <span className="text-sm font-semibold text-fg">{formatPercent(candidate.similarity)} similar</span>
          </div>
          <p className="mt-1 text-sm text-fg-muted">{candidate.rationale}</p>
        </li>
      ))}
    </ul>
  );
}

type MergedListProps = { ids: string[]; titles: Map<string, string> };

export function MergedList({ ids, titles }: MergedListProps) {
  if (ids.length === 0) return <p className="text-sm text-fg-muted">No other requests have been merged into this one.</p>;
  return (
    <ul className="list-inside list-disc space-y-1 text-sm">
      {ids.map((id) => (
        <li key={id}>
          <Link href={`/requests/${id}`} className="text-accent hover:underline">
            {displayTitle(id, titles)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
