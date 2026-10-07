import {
  API_ROUTES,
  AnalyzeFeatureRequestResponse,
  ClusterResponse,
  CreateBriefResponse,
  CreateFeatureRequestResponse,
  CreateStakeholderDraftResponse,
  GetFeatureRequestResponse,
  HealthResponse,
  ListBriefsResponse,
  ListFeatureRequestsResponse,
  ListStakeholderDraftsResponse,
  ListThemesResponse,
  MergeFeatureRequestResponse,
  RecordBriefDecisionResponse,
  UpdateFeatureRequestStatusResponse,
  UpdateStakeholderDraftResponse,
  VoteCountResponse,
  type CreateBriefBody,
  type CreateFeatureRequestBody,
  type CreateStakeholderDraftBody,
  type ListBriefsQuery,
  type ListFeatureRequestsQuery,
  type MergeFeatureRequestBody,
  type RecordBriefDecisionBody,
  type UpdateFeatureRequestStatusBody,
  type UpdateStakeholderDraftBody,
  type VoteBody,
} from '@fis/shared';
import { AI_TIMEOUT_MS } from './config';
import { type ApiResult, apiRequest, routeWithId } from './http';

export type { ApiFailure, ApiResult } from './http';

export type ListQuery = Partial<ListFeatureRequestsQuery>;

export function getHealth(): Promise<ApiResult<HealthResponse>> {
  return apiRequest({ method: 'GET', path: API_ROUTES.health, schema: HealthResponse });
}

export function listFeatureRequests(query: ListQuery): Promise<ApiResult<ListFeatureRequestsResponse>> {
  return apiRequest({
    method: 'GET',
    path: API_ROUTES.featureRequests,
    schema: ListFeatureRequestsResponse,
    query: {
      q: query.q,
      status: query.status,
      themeId: query.themeId,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    },
  });
}

export function getFeatureRequest(id: string): Promise<ApiResult<GetFeatureRequestResponse>> {
  return apiRequest({ method: 'GET', path: routeWithId(API_ROUTES.featureRequest, id), schema: GetFeatureRequestResponse });
}

export function createFeatureRequest(body: CreateFeatureRequestBody): Promise<ApiResult<CreateFeatureRequestResponse>> {
  return apiRequest({
    method: 'POST',
    path: API_ROUTES.featureRequests,
    schema: CreateFeatureRequestResponse,
    body,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

export function addVote(id: string, body: VoteBody): Promise<ApiResult<VoteCountResponse>> {
  return apiRequest({ method: 'POST', path: routeWithId(API_ROUTES.featureRequestVotes, id), schema: VoteCountResponse, body });
}

export function removeVote(id: string, body: VoteBody): Promise<ApiResult<VoteCountResponse>> {
  return apiRequest({ method: 'DELETE', path: routeWithId(API_ROUTES.featureRequestVotes, id), schema: VoteCountResponse, body });
}

export function mergeFeatureRequest(id: string, body: MergeFeatureRequestBody): Promise<ApiResult<MergeFeatureRequestResponse>> {
  return apiRequest({
    method: 'POST',
    path: routeWithId(API_ROUTES.featureRequestMerge, id),
    schema: MergeFeatureRequestResponse,
    body,
  });
}

export function updateFeatureRequestStatus(
  id: string,
  body: UpdateFeatureRequestStatusBody,
): Promise<ApiResult<UpdateFeatureRequestStatusResponse>> {
  return apiRequest({
    method: 'PATCH',
    path: routeWithId(API_ROUTES.featureRequestStatus, id),
    schema: UpdateFeatureRequestStatusResponse,
    body,
  });
}

export function analyzeFeatureRequest(id: string): Promise<ApiResult<AnalyzeFeatureRequestResponse>> {
  return apiRequest({
    method: 'POST',
    path: routeWithId(API_ROUTES.analyze, id),
    schema: AnalyzeFeatureRequestResponse,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

export function clusterThemes(): Promise<ApiResult<ClusterResponse>> {
  return apiRequest({ method: 'POST', path: API_ROUTES.cluster, schema: ClusterResponse, body: {}, timeoutMs: AI_TIMEOUT_MS });
}

export function listThemes(): Promise<ApiResult<ListThemesResponse>> {
  return apiRequest({ method: 'GET', path: API_ROUTES.themes, schema: ListThemesResponse });
}

export function createBrief(body: CreateBriefBody): Promise<ApiResult<CreateBriefResponse>> {
  return apiRequest({ method: 'POST', path: API_ROUTES.briefs, schema: CreateBriefResponse, body, timeoutMs: AI_TIMEOUT_MS });
}

export function listBriefs(query: ListBriefsQuery): Promise<ApiResult<ListBriefsResponse>> {
  return apiRequest({
    method: 'GET',
    path: API_ROUTES.briefList,
    schema: ListBriefsResponse,
    query: { themeId: query.themeId, featureRequestId: query.featureRequestId, status: query.status },
  });
}

export function listStakeholderDrafts(briefId: string): Promise<ApiResult<ListStakeholderDraftsResponse>> {
  return apiRequest({ method: 'GET', path: routeWithId(API_ROUTES.briefDrafts, briefId), schema: ListStakeholderDraftsResponse });
}

export function recordBriefDecision(id: string, body: RecordBriefDecisionBody): Promise<ApiResult<RecordBriefDecisionResponse>> {
  return apiRequest({
    method: 'PATCH',
    path: routeWithId(API_ROUTES.briefDecision, id),
    schema: RecordBriefDecisionResponse,
    body,
  });
}

export function createStakeholderDraft(
  briefId: string,
  body: CreateStakeholderDraftBody,
): Promise<ApiResult<CreateStakeholderDraftResponse>> {
  return apiRequest({
    method: 'POST',
    path: routeWithId(API_ROUTES.briefDrafts, briefId),
    schema: CreateStakeholderDraftResponse,
    body,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

export function updateStakeholderDraft(
  id: string,
  body: UpdateStakeholderDraftBody,
): Promise<ApiResult<UpdateStakeholderDraftResponse>> {
  return apiRequest({ method: 'PATCH', path: routeWithId(API_ROUTES.draft, id), schema: UpdateStakeholderDraftResponse, body });
}
