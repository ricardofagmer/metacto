import type { FeatureRequestListItem, Theme } from '@fis/shared';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ProviderBadge } from '@/components/ui/provenance';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/labels';
import { VoteButton } from '@/features/votes/vote-button';

const DESCRIPTION_PREVIEW_LENGTH = 220;

function preview(text: string): string {
  return text.length > DESCRIPTION_PREVIEW_LENGTH ? `${text.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...` : text;
}

type RequestCardProps = { request: FeatureRequestListItem; theme: Theme | undefined };

export function RequestCard({ request, theme }: RequestCardProps) {
  const titleId = `request-${request.id}-title`;
  return (
    <li>
      <article aria-labelledby={titleId} className="flex gap-4 rounded-card border border-border bg-surface p-4 shadow-sm sm:p-5">
        <VoteButton requestId={request.id} voteCount={request.voteCount} title={request.title} disabled={request.status === 'merged'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} />
            {theme !== undefined ? <Badge tone="accent">{theme.name}</Badge> : null}
            <PriorityChip request={request} />
          </div>
          <h2 id={titleId} className="mt-2 text-base font-semibold text-fg">
            <Link href={`/requests/${request.id}`} className="hover:underline">
              {request.title}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-fg-muted">{preview(request.description)}</p>
          <p className="mt-2 text-xs text-fg-muted">
            {request.authorName} &middot; <time dateTime={request.createdAt}>{formatDate(request.createdAt)}</time>
          </p>
        </div>
      </article>
    </li>
  );
}

type PriorityChipProps = { request: Pick<FeatureRequestListItem, 'priorityScore' | 'priorityProvider' | 'priorityModel'> };

// ADR 0003: the score always travels with the engine that produced it, so a heuristic score never reads as AI.
function PriorityChip({ request }: PriorityChipProps) {
  const { priorityScore, priorityProvider, priorityModel } = request;
  if (priorityScore === undefined) return <Badge tone="neutral">Not analysed yet</Badge>;
  return (
    <>
      <Badge tone="neutral" title="Priority 0-100, a recommendation. Open the request for the breakdown.">
        Priority {priorityScore} <span className="text-fg-muted">(recommendation)</span>
      </Badge>
      {priorityProvider !== undefined ? <ProviderBadge provider={priorityProvider} model={priorityModel} /> : null}
    </>
  );
}
