import { z } from 'zod';
import { ActorName, Id, NOTE_MAX_LENGTH, PaginationQuery, Provider, paginated } from './common';
import { FeatureRequest, FeatureRequestFields, FeatureRequestStatus, refineMergeLink } from './feature-request';
import { VoterKey } from './vote';
import { Analysis, DuplicateCandidate, PRIORITY_MAX, PRIORITY_MIN } from './analysis';
import { Theme } from './theme';
import { Audience, BriefStatus, BriefSubject, DecisionBrief, DraftBody, DraftStatus, StakeholderDraft } from './brief';

export const API_PREFIX = '/api/v1';

// Path templates relative to API_PREFIX; `:id` is the only route parameter.
export const API_ROUTES = {
  featureRequests: '/feature-requests',
  featureRequest: '/feature-requests/:id',
  featureRequestVotes: '/feature-requests/:id/votes',
  featureRequestMerge: '/feature-requests/:id/merge',
  featureRequestStatus: '/feature-requests/:id/status',
  analyze: '/intelligence/analyze/:id',
  cluster: '/intelligence/cluster',
  themes: '/themes',
  briefs: '/intelligence/briefs',
  briefList: '/briefs',
  briefDecision: '/briefs/:id/decision',
  briefDrafts: '/briefs/:id/drafts',
  draft: '/drafts/:id',
  health: '/health',
} as const;

export const SEARCH_QUERY_MAX_LENGTH = 200;

const DecisionNote = z.string().max(NOTE_MAX_LENGTH);

// Route params for every `/:id` endpoint.
export const IdParams = z.object({ id: Id }).strict();
export type IdParams = z.infer<typeof IdParams>;

// POST /feature-requests
export const CreateFeatureRequestBody = FeatureRequestFields.pick({
  title: true,
  description: true,
  authorName: true,
}).strict();
export type CreateFeatureRequestBody = z.infer<typeof CreateFeatureRequestBody>;

export const CreateFeatureRequestResponse = z.object({
  request: FeatureRequest,
  duplicateCandidates: z.array(DuplicateCandidate),
  provider: Provider,
});
export type CreateFeatureRequestResponse = z.infer<typeof CreateFeatureRequestResponse>;

// GET /feature-requests
export const FeatureRequestSort = z.enum(['votes', 'priority', 'recent']);
export type FeatureRequestSort = z.infer<typeof FeatureRequestSort>;

export const DEFAULT_FEATURE_REQUEST_SORT: FeatureRequestSort = 'recent';

export const ListFeatureRequestsQuery = PaginationQuery.extend({
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  status: FeatureRequestStatus.optional(),
  themeId: Id.optional(),
  sort: FeatureRequestSort.default(DEFAULT_FEATURE_REQUEST_SORT),
}).strict();
export type ListFeatureRequestsQuery = z.infer<typeof ListFeatureRequestsQuery>;

// priorityScore is absent for unanalysed requests, which sort last under sort=priority.
export const FeatureRequestListItem = FeatureRequestFields.extend({
  priorityScore: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX).optional(),
  // Present whenever priorityScore is, so the UI never labels a heuristic score as AI.
  priorityProvider: Provider.optional(),
  priorityModel: z.string().min(1).max(100).optional(),
}).superRefine(refineMergeLink);
export type FeatureRequestListItem = z.infer<typeof FeatureRequestListItem>;

export const ListFeatureRequestsResponse = paginated(FeatureRequestListItem);
export type ListFeatureRequestsResponse = z.infer<typeof ListFeatureRequestsResponse>;

// GET /feature-requests/:id
export const GetFeatureRequestResponse = z.object({
  request: FeatureRequest,
  analysis: Analysis.nullable(),
  votes: z.number().int().min(0),
  mergedRequests: z.array(Id),
});
export type GetFeatureRequestResponse = z.infer<typeof GetFeatureRequestResponse>;

// POST and DELETE /feature-requests/:id/votes
export const VoteBody = z.object({ voterKey: VoterKey }).strict();
export type VoteBody = z.infer<typeof VoteBody>;

export const VoteCountResponse = z.object({ voteCount: z.number().int().min(0) });
export type VoteCountResponse = z.infer<typeof VoteCountResponse>;

// POST /feature-requests/:id/merge
export const MergeFeatureRequestBody = z
  .object({
    targetId: Id,
    decidedBy: ActorName,
    note: DecisionNote.optional(),
  })
  .strict();
export type MergeFeatureRequestBody = z.infer<typeof MergeFeatureRequestBody>;

export const MergeFeatureRequestResponse = z.object({
  source: FeatureRequest,
  target: FeatureRequest,
});
export type MergeFeatureRequestResponse = z.infer<typeof MergeFeatureRequestResponse>;

// PATCH /feature-requests/:id/status
// 'merged' is reachable only through the merge endpoint.
export const UpdatableFeatureRequestStatus = FeatureRequestStatus.exclude(['merged']);
export type UpdatableFeatureRequestStatus = z.infer<typeof UpdatableFeatureRequestStatus>;

export const UpdateFeatureRequestStatusBody = z
  .object({
    status: UpdatableFeatureRequestStatus,
    decidedBy: ActorName,
    note: DecisionNote.optional(),
  })
  .strict();
export type UpdateFeatureRequestStatusBody = z.infer<typeof UpdateFeatureRequestStatusBody>;

export const UpdateFeatureRequestStatusResponse = FeatureRequest;
export type UpdateFeatureRequestStatusResponse = z.infer<typeof UpdateFeatureRequestStatusResponse>;

// POST /intelligence/analyze/:id
export const AnalyzeFeatureRequestResponse = Analysis;
export type AnalyzeFeatureRequestResponse = z.infer<typeof AnalyzeFeatureRequestResponse>;

// POST /intelligence/cluster
export const ClusterRequestBody = z.object({}).strict();
export type ClusterRequestBody = z.infer<typeof ClusterRequestBody>;

export const ClusterResponse = z.object({
  themes: z.array(Theme),
  provider: Provider,
});
export type ClusterResponse = z.infer<typeof ClusterResponse>;

// GET /themes
export const ListThemesResponse = z.object({ items: z.array(Theme) });
export type ListThemesResponse = z.infer<typeof ListThemesResponse>;

// POST /intelligence/briefs
export const CreateBriefBody = BriefSubject;
export type CreateBriefBody = z.infer<typeof CreateBriefBody>;

export const CreateBriefResponse = DecisionBrief;
export type CreateBriefResponse = z.infer<typeof CreateBriefResponse>;

// GET /briefs?themeId|featureRequestId (read-back so a reload does not lose generated briefs)
export const ListBriefsQuery = z
  .object({ themeId: Id.optional(), featureRequestId: Id.optional(), status: BriefStatus.optional() })
  .strict();
export type ListBriefsQuery = z.infer<typeof ListBriefsQuery>;

export const ListBriefsResponse = z.object({ items: z.array(DecisionBrief) });
export type ListBriefsResponse = z.infer<typeof ListBriefsResponse>;

// GET /briefs/:id/drafts
export const ListStakeholderDraftsResponse = z.object({ items: z.array(StakeholderDraft) });
export type ListStakeholderDraftsResponse = z.infer<typeof ListStakeholderDraftsResponse>;

// PATCH /briefs/:id/decision
export const BriefDecisionStatus = BriefStatus.exclude(['draft']);
export type BriefDecisionStatus = z.infer<typeof BriefDecisionStatus>;

export const RecordBriefDecisionBody = z
  .object({
    status: BriefDecisionStatus,
    decidedBy: ActorName,
    decisionNote: DecisionNote.optional(),
  })
  .strict();
export type RecordBriefDecisionBody = z.infer<typeof RecordBriefDecisionBody>;

export const RecordBriefDecisionResponse = DecisionBrief;
export type RecordBriefDecisionResponse = z.infer<typeof RecordBriefDecisionResponse>;

// POST /briefs/:id/drafts
export const CreateStakeholderDraftBody = z.object({ audience: Audience }).strict();
export type CreateStakeholderDraftBody = z.infer<typeof CreateStakeholderDraftBody>;

export const CreateStakeholderDraftResponse = StakeholderDraft;
export type CreateStakeholderDraftResponse = z.infer<typeof CreateStakeholderDraftResponse>;

// PATCH /drafts/:id
export const UpdateStakeholderDraftBody = z
  .object({
    body: DraftBody.optional(),
    status: DraftStatus.optional(),
    updatedBy: ActorName,
  })
  .strict()
  .refine((value) => value.body !== undefined || value.status !== undefined, {
    message: 'at least one of body or status is required',
    path: ['body'],
  });
export type UpdateStakeholderDraftBody = z.infer<typeof UpdateStakeholderDraftBody>;

export const UpdateStakeholderDraftResponse = StakeholderDraft;
export type UpdateStakeholderDraftResponse = z.infer<typeof UpdateStakeholderDraftResponse>;

// GET /health
export const HealthResponse = z.object({
  status: z.literal('ok'),
  database: z.enum(['up', 'down']),
  provider: Provider,
  version: z.string().min(1),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
