import { z } from 'zod';
import { PriorityBreakdown } from './analysis';

// Single home of the prioritisation criteria (ADR 0007). Values sum to 1.
// `satisfies` makes a criterion added to PriorityBreakdown, or here alone, fail typecheck.
export const SCORING_WEIGHTS = {
  reach: 0.25,
  impact: 0.25,
  strategicFit: 0.2,
  effortInverse: 0.15,
  demand: 0.15,
} as const satisfies Record<keyof PriorityBreakdown, number>;

export type ScoringCriterion = keyof typeof SCORING_WEIGHTS;

// Lets providers validate the weights they receive as input against the constant itself.
export const ScoringWeights = z.object({
  reach: z.literal(SCORING_WEIGHTS.reach),
  impact: z.literal(SCORING_WEIGHTS.impact),
  strategicFit: z.literal(SCORING_WEIGHTS.strategicFit),
  effortInverse: z.literal(SCORING_WEIGHTS.effortInverse),
  demand: z.literal(SCORING_WEIGHTS.demand),
});
export type ScoringWeights = z.infer<typeof ScoringWeights>;

const SCORE_DECIMAL_FACTOR = 10;

// The application, never the model, computes the aggregate so the same breakdown always yields the same score.
export function computePriorityScore(breakdown: PriorityBreakdown): number {
  // A Record over every criterion turns a forgotten term into a compile error.
  const contributions: Record<ScoringCriterion, number> = {
    reach: breakdown.reach * SCORING_WEIGHTS.reach,
    impact: breakdown.impact * SCORING_WEIGHTS.impact,
    strategicFit: breakdown.strategicFit * SCORING_WEIGHTS.strategicFit,
    effortInverse: breakdown.effortInverse * SCORING_WEIGHTS.effortInverse,
    demand: breakdown.demand * SCORING_WEIGHTS.demand,
  };
  const weightedSum = Object.values(contributions).reduce((total, value) => total + value, 0);
  return Math.round(weightedSum * SCORE_DECIMAL_FACTOR) / SCORE_DECIMAL_FACTOR;
}
