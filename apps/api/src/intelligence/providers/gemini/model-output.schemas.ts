import { z } from 'zod';
import {
  AnalysisFields,
  DUPLICATE_RATIONALE_MAX_LENGTH,
  DraftBody,
  DraftBriefOutput,
  MAX_DUPLICATE_LIMIT,
  MAX_THEMES,
  PriorityBreakdown,
  PriorityScore,
  Theme,
} from '@fis/shared';

/**
 * What the model is asked to return, derived from the shared output schemas. The model never
 * supplies provider, model, promptVersion, the total score or demand: the application owns those,
 * and the mappers rebuild the full shared output, which is parsed again before it leaves.
 */
const MAX_REF_LENGTH = 8;
const RequestRef = z.string().regex(/^r\d+$/).max(MAX_REF_LENGTH);

const ModelDuplicateCandidate = z.object({
  ref: RequestRef,
  similarity: z.number().min(0).max(1),
  rationale: z.string().min(1).max(DUPLICATE_RATIONALE_MAX_LENGTH),
});

export const JudgementBreakdown = PriorityBreakdown.omit({ demand: true });
export type JudgementBreakdown = z.infer<typeof JudgementBreakdown>;

export const DuplicatesModelOutput = z.object({
  candidates: z.array(ModelDuplicateCandidate).max(MAX_DUPLICATE_LIMIT),
});
export type DuplicatesModelOutput = z.infer<typeof DuplicatesModelOutput>;

export const ClusterModelOutput = z.object({
  themes: z
    .array(
      Theme.pick({ name: true, summary: true }).extend({
        refs: z.array(RequestRef).min(1),
      }),
    )
    .max(MAX_THEMES),
});
export type ClusterModelOutput = z.infer<typeof ClusterModelOutput>;

export const PriorityModelOutput = z.object({
  breakdown: JudgementBreakdown,
  rationale: PriorityScore.shape.rationale,
});
export type PriorityModelOutput = z.infer<typeof PriorityModelOutput>;

export const AnalyzeModelOutput = z.object({
  underlyingNeed: AnalysisFields.shape.underlyingNeed,
  duplicateCandidates: DuplicatesModelOutput.shape.candidates,
  breakdown: JudgementBreakdown,
  rationale: PriorityScore.shape.rationale,
});
export type AnalyzeModelOutput = z.infer<typeof AnalyzeModelOutput>;

export const BriefModelOutput = DraftBriefOutput.pick({
  recommendation: true,
  evidence: true,
  risks: true,
  openQuestions: true,
});
export type BriefModelOutput = z.infer<typeof BriefModelOutput>;

export const StakeholderModelOutput = z.object({ body: DraftBody });
export type StakeholderModelOutput = z.infer<typeof StakeholderModelOutput>;
