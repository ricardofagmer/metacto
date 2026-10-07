import { DEFAULT_PAGE, PaginationQuery } from '@fis/shared';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { AiExplainer } from '@/components/ui/provenance';
import { RetryButton } from '@/components/ui/retry-button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { listFeatureRequests } from '@/lib/api';
import { loadStoredBriefs } from '@/features/briefs/load-briefs';
import { PmOnly } from '@/features/pm-mode/pm-only';
import { TriageItem } from '@/features/triage/triage-item';

export const metadata: Metadata = { title: 'Triage' };

type TriagePageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TRIAGE_STATUS = 'open';

export default async function TriagePage({ searchParams }: TriagePageProps) {
  const rawPage = (await searchParams).page;
  const parsedPage = PaginationQuery.shape.page.safeParse(Array.isArray(rawPage) ? rawPage[0] : rawPage);
  const page = parsedPage.success ? parsedPage.data : DEFAULT_PAGE;
  const result = await listFeatureRequests({ sort: 'priority', status: TRIAGE_STATUS, page });
  // Only scored requests render a brief panel, so only they need their stored brief read back.
  const scoredSubjects = result.ok
    ? result.data.items.filter((request) => request.priorityScore !== undefined).map((request) => ({ featureRequestId: request.id }))
    : [];
  const storedBriefFor = await loadStoredBriefs(scoredSubjects);

  return (
    <>
      <PageHeader
        title="Triage"
        description="Open requests ranked by recommended priority. Generate a brief, decide, then draft the updates stakeholders will read."
      />
      <div className="mb-4">
        <AiExplainer />
      </div>
      <PmOnly
        fallback={
          <EmptyState
            title="Triage is for product managers"
            description="Turn on PM mode in the header and enter the name your decisions should be recorded under."
          />
        }
      >
        {!result.ok ? (
          <ErrorState title="The triage queue could not be loaded" failure={result.error} action={<RetryButton />} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            title="Nothing to triage"
            description="There are no open requests right now. New submissions will appear here ranked by priority."
            action={<ButtonLink href="/" variant="secondary">Browse all requests</ButtonLink>}
          />
        ) : (
          <section aria-label="Triage queue">
            <ol className="space-y-4">
              {result.data.items.map((request, index) => (
                <TriageItem
                  key={request.id}
                  request={request}
                  rank={(result.data.page - 1) * result.data.limit + index + 1}
                  stored={storedBriefFor({ featureRequestId: request.id })}
                />
              ))}
            </ol>
            <Pagination
              page={result.data.page}
              limit={result.data.limit}
              total={result.data.total}
              hrefFor={(target) => (target === DEFAULT_PAGE ? '/triage' : `/triage?page=${target}`)}
            />
          </section>
        )}
      </PmOnly>
    </>
  );
}
