import { IdParams } from '@fis/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, SectionHeading } from '@/components/ui/card';
import { RetryButton } from '@/components/ui/retry-button';
import { ErrorState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { getFeatureRequest } from '@/lib/api';
import { formatDate } from '@/lib/labels';
import { AnalysisSection } from '@/features/request-detail/analysis-section';
import { loadRequestTitles } from '@/features/request-detail/load-titles';
import { PmActions } from '@/features/request-detail/pm-actions';
import { MergedList } from '@/features/request-detail/related-list';
import { VoteButton } from '@/features/votes/vote-button';

type RequestPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: 'Feature request' };

export default async function RequestPage({ params }: RequestPageProps) {
  const parsedParams = IdParams.safeParse(await params);
  if (!parsedParams.success) notFound();
  const result = await getFeatureRequest(parsedParams.data.id);
  if (!result.ok) {
    if (result.error.kind === 'envelope' && result.error.envelope.code === 'not_found') notFound();
    return <ErrorState title="This feature request could not be loaded" failure={result.error} action={<RetryButton />} />;
  }

  const { request, analysis, votes, mergedRequests } = result.data;
  const candidateIds = analysis?.duplicateCandidates.map((candidate) => candidate.id) ?? [];
  const [candidateTitles, mergedTitles] = await Promise.all([loadRequestTitles(candidateIds), loadRequestTitles(mergedRequests)]);
  const suggestions = candidateIds
    .filter((id) => id !== request.id)
    .flatMap((id) => {
      const title = candidateTitles.get(id);
      return title !== undefined ? [{ id, title }] : [];
    });

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        Back to Discover
      </Link>
      <Card as="article">
        <div className="flex gap-4">
          <VoteButton requestId={request.id} voteCount={votes} title={request.title} disabled={request.status === 'merged'} />
          <div className="min-w-0 flex-1">
            <StatusBadge status={request.status} />
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">{request.title}</h1>
            <p className="mt-1 text-xs text-fg-muted">
              {request.authorName} &middot; <time dateTime={request.createdAt}>{formatDate(request.createdAt)}</time>
            </p>
            {request.mergedIntoId !== undefined ? (
              <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-fg">
                Merged into{' '}
                <Link href={`/requests/${request.mergedIntoId}`} className="font-medium text-accent hover:underline">
                  the target request
                </Link>
                . Votes now count there.
              </p>
            ) : null}
            <p className="mt-4 whitespace-pre-line text-sm text-fg">{request.description}</p>
          </div>
        </div>
      </Card>

      <AnalysisSection requestId={request.id} analysis={analysis} titles={candidateTitles} />

      <Card as="section">
        <SectionHeading>Merged requests</SectionHeading>
        <MergedList ids={mergedRequests} titles={mergedTitles} />
      </Card>

      <Card as="section">
        <SectionHeading>Product decisions</SectionHeading>
        <PmActions requestId={request.id} status={request.status} suggestions={suggestions} />
      </Card>
    </div>
  );
}
