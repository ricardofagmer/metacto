import { DEFAULT_FEATURE_REQUEST_SORT, DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, ListFeatureRequestsQuery } from '@fis/shared';

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type DiscoverParams = {
  q?: string;
  status?: ListFeatureRequestsQuery['status'];
  themeId?: string;
  sort: ListFeatureRequestsQuery['sort'];
  page: number;
  limit: number;
};

function first(value: string | string[] | undefined): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  return single === undefined || single.trim() === '' ? undefined : single;
}

// Each field is validated on its own so one bad value in a shared URL drops that filter, not the whole view.
export function parseDiscoverParams(raw: RawSearchParams): DiscoverParams {
  const shape = ListFeatureRequestsQuery.shape;
  const q = shape.q.safeParse(first(raw.q));
  const status = shape.status.safeParse(first(raw.status));
  const themeId = shape.themeId.safeParse(first(raw.themeId));
  const sort = shape.sort.safeParse(first(raw.sort));
  const page = shape.page.safeParse(first(raw.page));
  return {
    q: q.success ? q.data : undefined,
    status: status.success ? status.data : undefined,
    themeId: themeId.success ? themeId.data : undefined,
    sort: sort.success ? sort.data : DEFAULT_FEATURE_REQUEST_SORT,
    page: page.success ? page.data : DEFAULT_PAGE,
    limit: DEFAULT_PAGE_LIMIT,
  };
}

export function discoverHref(params: DiscoverParams, page: number): string {
  const search = new URLSearchParams();
  if (params.q !== undefined) search.set('q', params.q);
  if (params.status !== undefined) search.set('status', params.status);
  if (params.themeId !== undefined) search.set('themeId', params.themeId);
  search.set('sort', params.sort);
  if (page !== DEFAULT_PAGE) search.set('page', String(page));
  return `/?${search.toString()}`;
}

export function hasActiveFilters(params: DiscoverParams): boolean {
  return params.q !== undefined || params.status !== undefined || params.themeId !== undefined;
}
