import { z } from 'zod';
import { Provider } from './common';
import { FeatureRequestFields } from './feature-request';
import { Analysis, AnalysisFields, DuplicateCandidate, PriorityScore, UNDERLYING_NEED_MAX_LENGTH, refineModelMatchesProvider } from './analysis';
import { Theme } from './theme';
import { Audience, BriefSubject, DecisionBrief, DecisionBriefFields, DraftBody } from './brief';
import { ScoringWeights } from './scoring';
import { ErrorCode } from './errors';

// Corpus bound: the services pass at most the 500 most recent non-merged requests.
export const MAX_CORPUS_SIZE = 500;
export const DEFAULT_DUPLICATE_THRESHOLD = 0.6;
export const MAX_DUPLICATE_LIMIT = 10;
export const DEFAULT_DUPLICATE_LIMIT = 5;
export const MAX_THEMES = 20;
export const DEFAULT_MAX_THEMES = 8;

const optionalModel = z.string().min(1).optional();
const promptVersion = z.string().min(1);

export const RequestSummary = FeatureRequestFields.pick({
  id: true,
  title: true,
  description: true,
  voteCount: true,
  status: true,
});
export type RequestSummary = z.infer<typeof RequestSummary>;

const RequestText = FeatureRequestFields.pick({ id: true, title: true, description: true });
const Corpus = z.array(RequestSummary).max(MAX_CORPUS_SIZE);

export const AnalyzeInput = z.object({
  request: RequestText,
  corpus: Corpus,
});
export type AnalyzeInput = z.infer<typeof AnalyzeInput>;

export const AnalyzeOutput = AnalysisFields.omit({ createdAt: true }).superRefine(refineModelMatchesProvider);
export type AnalyzeOutput = z.infer<typeof AnalyzeOutput>;

export const FindDuplicatesInput = z.object({
  request: RequestText,
  corpus: Corpus,
  threshold: z.number().min(0).max(1).default(DEFAULT_DUPLICATE_THRESHOLD),
  limit: z.number().int().min(1).max(MAX_DUPLICATE_LIMIT).default(DEFAULT_DUPLICATE_LIMIT),
});
export type FindDuplicatesInput = z.infer<typeof FindDuplicatesInput>;

export const FindDuplicatesOutput = z.object({
  candidates: z.array(DuplicateCandidate).max(MAX_DUPLICATE_LIMIT),
  provider: Provider,
  model: optionalModel,
  promptVersion,
});
export type FindDuplicatesOutput = z.infer<typeof FindDuplicatesOutput>;

const MIN_CLUSTER_REQUESTS = 2;

export const ClusterInput = z.object({
  requests: z.array(RequestSummary).min(MIN_CLUSTER_REQUESTS).max(MAX_CORPUS_SIZE),
  maxThemes: z.number().int().min(1).max(MAX_THEMES).default(DEFAULT_MAX_THEMES),
});
export type ClusterInput = z.infer<typeof ClusterInput>;

export const ClusterOutput = z
  .object({
    themes: z.array(Theme.omit({ id: true })).max(MAX_THEMES),
    provider: Provider,
    model: optionalModel,
    promptVersion,
  })
  .superRefine((output, context) => {
    const seen = new Set<string>();
    output.themes.forEach((theme, themeIndex) => {
      theme.requestIds.forEach((requestId, requestIndex) => {
        if (seen.has(requestId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['themes', themeIndex, 'requestIds', requestIndex],
            message: 'a request id may appear in at most one theme',
          });
        }
        seen.add(requestId);
      });
    });
  });
export type ClusterOutput = z.infer<typeof ClusterOutput>;

export const ScorePriorityInput = z.object({
  request: RequestSummary,
  underlyingNeed: z.string().min(1).max(UNDERLYING_NEED_MAX_LENGTH),
  weights: ScoringWeights,
  corpusSize: z.number().int().min(0),
  maxVoteCount: z.number().int().min(0),
});
export type ScorePriorityInput = z.infer<typeof ScorePriorityInput>;

export const ScorePriorityOutput = z.object({
  priority: PriorityScore,
  provider: Provider,
  model: optionalModel,
  promptVersion,
});
export type ScorePriorityOutput = z.infer<typeof ScorePriorityOutput>;

export const DraftBriefInput = z.object({
  subject: BriefSubject,
  requests: z.array(RequestSummary).min(1).max(MAX_CORPUS_SIZE),
  analyses: z.array(Analysis).max(MAX_CORPUS_SIZE),
  theme: Theme.optional(),
});
export type DraftBriefInput = z.infer<typeof DraftBriefInput>;

export const DraftBriefOutput = DecisionBriefFields.pick({
  recommendation: true,
  evidence: true,
  risks: true,
  openQuestions: true,
  provider: true,
  model: true,
  promptVersion: true,
});
export type DraftBriefOutput = z.infer<typeof DraftBriefOutput>;

export const DraftStakeholderInput = z.object({
  brief: DecisionBrief,
  audience: Audience,
  requests: z.array(RequestSummary).max(MAX_CORPUS_SIZE),
});
export type DraftStakeholderInput = z.infer<typeof DraftStakeholderInput>;

// Bounded like StakeholderDraft.body so every valid output is storable as a draft.
export const DraftStakeholderOutput = z.object({
  body: DraftBody,
  provider: Provider,
  model: optionalModel,
  promptVersion,
});
export type DraftStakeholderOutput = z.infer<typeof DraftStakeholderOutput>;

/**
 * Port for every AI capability (ADR 0003). Implementations never write to the database,
 * set `provider` on every output to `this.provider`, and throw IntelligenceUnavailableError
 * when they cannot produce a schema-valid result.
 */
export interface IntelligenceService {
  readonly provider: Provider;
  analyze(input: AnalyzeInput): Promise<AnalyzeOutput>;
  findDuplicates(input: FindDuplicatesInput): Promise<FindDuplicatesOutput>;
  cluster(input: ClusterInput): Promise<ClusterOutput>;
  scorePriority(input: ScorePriorityInput): Promise<ScorePriorityOutput>;
  draftBrief(input: DraftBriefInput): Promise<DraftBriefOutput>;
  draftStakeholderMessage(input: DraftStakeholderInput): Promise<DraftStakeholderOutput>;
}

export const IntelligenceCapability = z.enum([
  'analyze',
  'findDuplicates',
  'cluster',
  'scorePriority',
  'draftBrief',
  'draftStakeholderMessage',
]);
export type IntelligenceCapability = z.infer<typeof IntelligenceCapability>;

export type IntelligenceUnavailableErrorOptions = {
  capability: IntelligenceCapability;
  provider: Provider;
  cause?: unknown;
};

// Mapped to the heuristic fallback on submit-time dedupe and to HTTP 503 everywhere else.
export class IntelligenceUnavailableError extends Error {
  readonly code: Extract<ErrorCode, 'dependency'> = 'dependency';
  readonly capability: IntelligenceCapability;
  readonly provider: Provider;

  constructor(message: string, options: IntelligenceUnavailableErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'IntelligenceUnavailableError';
    this.capability = options.capability;
    this.provider = options.provider;
  }
}
