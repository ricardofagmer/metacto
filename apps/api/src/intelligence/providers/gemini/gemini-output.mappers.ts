import { DuplicateCandidate, PriorityScore, computePriorityScore } from '@fis/shared';
import { RequestRefs } from '../../prompts/prompt-data';
import { demandFromVotes } from '../demand';
import { ClusterModelOutput, DuplicatesModelOutput, JudgementBreakdown } from './model-output.schemas';

type ModelCandidate = DuplicatesModelOutput['candidates'][number];

export type CandidateFilter = {
  threshold: number;
  limit: number;
};

// Semantic checks the JSON schema cannot carry; failures go back to the model as retry feedback.
export function checkCandidateRefs(candidates: ModelCandidate[], allowedRefs: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  candidates.forEach((candidate, index) => {
    if (!allowedRefs.has(candidate.ref)) {
      problems.push(`candidates.${index}.ref "${candidate.ref}" is not in the candidate list`);
    }
    if (seen.has(candidate.ref)) {
      problems.push(`candidates.${index}.ref "${candidate.ref}" is repeated`);
    }
    seen.add(candidate.ref);
  });
  return problems;
}

export function checkThemeRefs(output: ClusterModelOutput, allowedRefs: ReadonlySet<string>, maxThemes: number): string[] {
  const problems: string[] = [];
  if (output.themes.length > maxThemes) {
    problems.push(`at most ${maxThemes} themes are allowed, got ${output.themes.length}`);
  }
  const seen = new Set<string>();
  output.themes.forEach((theme, themeIndex) => {
    theme.refs.forEach((ref, refIndex) => {
      if (!allowedRefs.has(ref)) {
        problems.push(`themes.${themeIndex}.refs.${refIndex} "${ref}" is not an input ref`);
      }
      if (seen.has(ref)) {
        problems.push(`themes.${themeIndex}.refs.${refIndex} "${ref}" already belongs to another theme`);
      }
      seen.add(ref);
    });
  });
  return problems;
}

// The application, not the model, applies threshold, order and limit, so the contract holds
// even when the model ignores those instructions.
export function toDuplicateCandidates(candidates: ModelCandidate[], refs: RequestRefs, filter: CandidateFilter): DuplicateCandidate[] {
  return candidates
    .flatMap((candidate) => {
      const id = refs.idOf(candidate.ref);
      return id === undefined ? [] : [{ id, similarity: candidate.similarity, rationale: candidate.rationale }];
    })
    .filter((candidate) => candidate.similarity >= filter.threshold)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, filter.limit);
}

export type PriorityParts = {
  breakdown: JudgementBreakdown;
  rationale: string;
  voteCount: number;
  maxVoteCount: number;
};

// ADR 0007: demand is arithmetic and the total is computePriorityScore; neither comes from the model.
export function toPriorityScore(parts: PriorityParts): PriorityScore {
  const breakdown = { ...parts.breakdown, demand: demandFromVotes(parts.voteCount, parts.maxVoteCount) };
  return { score: computePriorityScore(breakdown), breakdown, rationale: parts.rationale };
}

export function toThemes(output: ClusterModelOutput, refs: RequestRefs): Array<{ name: string; summary: string; requestIds: string[] }> {
  return output.themes.map((theme) => ({
    name: theme.name,
    summary: theme.summary,
    requestIds: theme.refs.flatMap((ref) => {
      const id = refs.idOf(ref);
      return id === undefined ? [] : [id];
    }),
  }));
}
