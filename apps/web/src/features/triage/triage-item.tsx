import type { FeatureRequestListItem } from '@fis/shared';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ProviderBadge } from '@/components/ui/provenance';
import { StatusBadge } from '@/components/ui/status-badge';
import { AnalyzeButton } from '@/features/analysis/analyze-button';
import { BriefPanel } from '@/features/briefs/brief-panel';
import type { StoredBrief } from '@/features/briefs/load-briefs';

type TriageItemProps = { request: FeatureRequestListItem; rank: number; stored: StoredBrief };

export function TriageItem({ request, rank, stored }: TriageItemProps) {
  const headingId = `triage-${request.id}`;
  return (
    <li>
      <article aria-labelledby={headingId} className="space-y-3 rounded-card border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <span className="rounded-lg bg-surface-muted px-2 py-1 text-sm font-bold tabular-nums text-fg" aria-label={`Rank ${rank}`}>
            #{rank}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-base font-semibold text-fg">
              <Link href={`/requests/${request.id}`} className="hover:underline">
                {request.title}
              </Link>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <Badge tone="neutral">
                {request.voteCount} {request.voteCount === 1 ? 'vote' : 'votes'}
              </Badge>
              {request.priorityScore !== undefined ? (
                <Badge tone="accent" title="Recommended priority, 0-100">
                  Priority {request.priorityScore}
                </Badge>
              ) : (
                <Badge tone="neutral">Not analysed</Badge>
              )}
              {request.priorityScore !== undefined && request.priorityProvider !== undefined ? (
                <ProviderBadge provider={request.priorityProvider} model={request.priorityModel} />
              ) : null}
            </div>
          </div>
        </div>
        {request.priorityScore === undefined ? (
          <AnalyzeButton requestId={request.id} label="Analyse to score" variant="secondary" />
        ) : (
          <BriefPanel subject={{ featureRequestId: request.id }} stored={stored} />
        )}
      </article>
    </li>
  );
}
