import { z } from 'zod';
import { Id, IsoDateTime, Provider } from './common';

export const DUPLICATE_RATIONALE_MAX_LENGTH = 500;
export const MAX_DUPLICATE_CANDIDATES = 10;
export const UNDERLYING_NEED_MAX_LENGTH = 1000;
export const PRIORITY_RATIONALE_MAX_LENGTH = 2000;
export const PRIORITY_MIN = 0;
export const PRIORITY_MAX = 100;

export const DuplicateCandidate = z.object({
  id: Id,
  similarity: z.number().min(0).max(1),
  rationale: z.string().min(1).max(DUPLICATE_RATIONALE_MAX_LENGTH),
});
export type DuplicateCandidate = z.infer<typeof DuplicateCandidate>;

const criterionValue = z.number().min(PRIORITY_MIN).max(PRIORITY_MAX);

// Keys must stay identical to SCORING_WEIGHTS; scoring.ts enforces that at compile time (ADR 0007).
export const PriorityBreakdown = z.object({
  reach: criterionValue,
  impact: criterionValue,
  strategicFit: criterionValue,
  effortInverse: criterionValue,
  demand: criterionValue,
});
export type PriorityBreakdown = z.infer<typeof PriorityBreakdown>;

export const PriorityScore = z.object({
  score: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX),
  breakdown: PriorityBreakdown,
  rationale: z.string().min(1).max(PRIORITY_RATIONALE_MAX_LENGTH),
});
export type PriorityScore = z.infer<typeof PriorityScore>;

type ProviderModelFields = { provider: Provider; model?: string | undefined };

// A model id is only meaningful for the Anthropic adapter; the heuristic path must never look like LLM output.
export function refineModelMatchesProvider(value: ProviderModelFields, context: z.RefinementCtx): void {
  const hasModel = value.model !== undefined;
  const isAnthropic = value.provider === 'anthropic';
  if (hasModel !== isAnthropic) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['model'],
      message: "model must be present if and only if provider is 'anthropic'",
    });
  }
}

// Unrefined object shape, reused by the IntelligenceService port output.
export const AnalysisFields = z.object({
  featureRequestId: Id,
  underlyingNeed: z.string().min(1).max(UNDERLYING_NEED_MAX_LENGTH),
  duplicateCandidates: z.array(DuplicateCandidate).max(MAX_DUPLICATE_CANDIDATES),
  priority: PriorityScore,
  provider: Provider,
  model: z.string().min(1).optional(),
  promptVersion: z.string().min(1),
  createdAt: IsoDateTime,
});

export const Analysis = AnalysisFields.superRefine(refineModelMatchesProvider);
export type Analysis = z.infer<typeof Analysis>;
