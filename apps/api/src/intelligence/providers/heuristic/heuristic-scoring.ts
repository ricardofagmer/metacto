import { PRIORITY_MAX, PRIORITY_MIN, PRIORITY_RATIONALE_MAX_LENGTH, PriorityBreakdown, PriorityScore, SCORING_WEIGHTS, computePriorityScore } from '@fis/shared';
import { demandFromVotes } from '../demand';
import { HEURISTIC_SCORING_RULES, JudgementCriterion, KeywordRule } from './heuristic-scoring-rules';

export type HeuristicScoreInput = {
  text: string;
  voteCount: number;
  maxVoteCount: number;
};

type CriterionResult = { value: number; explanation: string };

const JUDGEMENT_CRITERIA: readonly JudgementCriterion[] = ['reach', 'impact', 'strategicFit', 'effortInverse'];

function clamp(value: number): number {
  return Math.min(PRIORITY_MAX, Math.max(PRIORITY_MIN, value));
}

function escapeRegExp(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase)}($|[^a-z0-9])`).test(text);
}

function applyRule(text: string, rule: KeywordRule): CriterionResult {
  const raised = rule.raises.filter((phrase) => containsPhrase(text, phrase));
  const lowered = rule.lowers.filter((phrase) => containsPhrase(text, phrase));
  const value = clamp(rule.base + rule.step * (raised.length - lowered.length));
  const parts = [`base ${rule.base}`];
  if (raised.length > 0) {
    parts.push(`+${rule.step} each for ${raised.map((phrase) => `'${phrase}'`).join(', ')}`);
  }
  if (lowered.length > 0) {
    parts.push(`-${rule.step} each for ${lowered.map((phrase) => `'${phrase}'`).join(', ')}`);
  }
  return { value, explanation: parts.join('; ') };
}

export function scoreWithKeywordRules(input: HeuristicScoreInput): PriorityScore {
  const text = input.text.toLowerCase();
  const results = Object.fromEntries(
    JUDGEMENT_CRITERIA.map((criterion) => [criterion, applyRule(text, HEURISTIC_SCORING_RULES[criterion])]),
  );
  const valueOf = (criterion: JudgementCriterion): number => results[criterion]?.value ?? PRIORITY_MIN;
  const breakdown: PriorityBreakdown = {
    reach: valueOf('reach'),
    impact: valueOf('impact'),
    strategicFit: valueOf('strategicFit'),
    effortInverse: valueOf('effortInverse'),
    demand: demandFromVotes(input.voteCount, input.maxVoteCount),
  };
  const score = computePriorityScore(breakdown);
  const lines = JUDGEMENT_CRITERIA.map(
    (criterion) => `${criterion} ${breakdown[criterion]} (weight ${SCORING_WEIGHTS[criterion]}): ${results[criterion]?.explanation ?? 'no rule'}.`,
  );
  lines.push(`demand ${breakdown.demand} (weight ${SCORING_WEIGHTS.demand}): ${input.voteCount} of max ${input.maxVoteCount} votes.`);
  lines.push(`Score ${score} is the weighted sum. Heuristic keyword rules, not a language-model judgement.`);
  return { score, breakdown, rationale: lines.join(' ').slice(0, PRIORITY_RATIONALE_MAX_LENGTH) };
}
