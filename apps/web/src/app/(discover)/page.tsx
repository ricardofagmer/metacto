import type { Theme } from '@fis/shared';
import { PageHeader } from '@/components/layout/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { RetryButton } from '@/components/ui/retry-button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { listFeatureRequests, listThemes } from '@/lib/api';
import { InlineFailure } from '@/components/ui/inline-failure';
import { discoverHref, hasActiveFilters, parseDiscoverParams, type RawSearchParams } from '@/features/discover/discover-params';
import { FilterBar } from '@/features/discover/filter-bar';
import { RequestCard } from '@/features/discover/request-card';

type DiscoverPageProps = { searchParams: Promise<RawSearchParams> };

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = parseDiscoverParams(await searchParams);
  const [requestsResult, themesResult] = await Promise.all([listFeatureRequests(params), listThemes()]);
  const themes: Theme[] = themesResult.ok ? themesResult.data.items : [];
  const themesById = new Map(themes.map((theme) => [theme.id, theme]));

  return (
    <>
      <PageHeader
        title="Discover feature requests"
        description="Search what others have asked for and vote for what matters to you before submitting something new."
        actions={<ButtonLink href="/submit">Submit a request</ButtonLink>}
      />
      <FilterBar params={params} themes={themes} />
      {!themesResult.ok ? (
        <div className="mb-4">
          <InlineFailure failure={themesResult.error} prefix="Themes could not be loaded, so the theme filter is empty." />
        </div>
      ) : null}
      {!requestsResult.ok ? (
        <ErrorState title="Feature requests could not be loaded" failure={requestsResult.error} action={<RetryButton />} />
      ) : requestsResult.data.items.length === 0 ? (
        hasActiveFilters(params) ? (
          <EmptyState
            title="No requests match these filters"
            description="Try a broader search or clear the filters. If nobody has asked for it yet, be the first."
            action={<ButtonLink href="/" variant="secondary">Clear filters</ButtonLink>}
          />
        ) : (
          <EmptyState
            title="No feature requests yet"
            description="Requests appear here once someone submits one. Start the list with yours."
            action={<ButtonLink href="/submit">Submit the first request</ButtonLink>}
          />
        )
      ) : (
        <section aria-label="Feature requests">
          <p className="mb-3 text-sm text-fg-muted" aria-live="polite">
            {requestsResult.data.total} {requestsResult.data.total === 1 ? 'request' : 'requests'}
          </p>
          <ul className="space-y-3">
            {requestsResult.data.items.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                theme={request.themeId !== undefined ? themesById.get(request.themeId) : undefined}
              />
            ))}
          </ul>
          <Pagination
            page={requestsResult.data.page}
            limit={requestsResult.data.limit}
            total={requestsResult.data.total}
            hrefFor={(page) => discoverHref(params, page)}
          />
        </section>
      )}
    </>
  );
}
