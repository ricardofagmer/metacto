import { DEFAULT_DUPLICATE_THRESHOLD, DUPLICATE_RATIONALE_MAX_LENGTH, DuplicateCandidate, RequestSummary } from '@fis/shared';
import { buildTermVectors, cosineSimilarity, sharedTerms } from './text-vectors';

export type RankedMatch = {
  id: string;
  similarity: number;
  terms: string[];
};

export type RankSimilarOptions = {
  request: { id: string; title: string; description: string };
  corpus: RequestSummary[];
  limit: number;
  threshold: number;
};

const SHARED_TERM_LIMIT = 5;
const SIMILARITY_DECIMALS = 1000;
const MAX_SIMILARITY = 1;

/**
 * The port's threshold (default 0.6) is on the scale an LLM uses when it judges "same need".
 * Bag-of-words cosine between two short, independently worded requests lives far lower: on the
 * golden set real duplicates score 0.27-0.37 and the closest same-topic near miss (Okta SSO vs
 * Google login) 0.263, so a raw 0.6 cut returned nothing (recall 0%). This constant is the raw
 * cosine that maps onto the caller's default threshold: the midpoint of the gap between that
 * near miss and the weakest golden@1 duplicate. Re-sweep it with evals/run.ts whenever the
 * tokenizer, synonym table or golden set changes; evals/README.md records the sweep.
 */
export const HEURISTIC_COSINE_AT_DEFAULT_THRESHOLD = 0.267;

// Also used by the Gemini adapter to preselect a bounded candidate set before the model call,
// so it stays on the raw cosine scale; only the heuristic provider's output is calibrated.
export function rankSimilarRequests(options: RankSimilarOptions): RankedMatch[] {
  const others = options.corpus.filter((entry) => entry.id !== options.request.id);
  const { vectors } = buildTermVectors([options.request, ...others]);
  const target = vectors.get(options.request.id);
  if (target === undefined) {
    return [];
  }
  return others
    .map((entry): RankedMatch => {
      const vector = vectors.get(entry.id) ?? new Map<string, number>();
      return {
        id: entry.id,
        similarity: roundSimilarity(cosineSimilarity(target, vector)),
        terms: sharedTerms(target, vector, SHARED_TERM_LIMIT),
      };
    })
    .filter((match) => match.similarity >= options.threshold)
    .sort((left, right) => right.similarity - left.similarity || left.id.localeCompare(right.id))
    .slice(0, options.limit);
}

function roundSimilarity(value: number): number {
  return Math.round(value * SIMILARITY_DECIMALS) / SIMILARITY_DECIMALS;
}

// Piecewise-linear and monotonic: [0, anchor] -> [0, default] and [anchor, 1] -> [default, 1],
// so ranking is unchanged, nothing saturates, and a caller threshold means the same thing for
// every provider.
export function cosineToCallerScale(cosine: number): number {
  const anchor = HEURISTIC_COSINE_AT_DEFAULT_THRESHOLD;
  const scaled =
    cosine <= anchor
      ? (cosine * DEFAULT_DUPLICATE_THRESHOLD) / anchor
      : DEFAULT_DUPLICATE_THRESHOLD + ((cosine - anchor) * (MAX_SIMILARITY - DEFAULT_DUPLICATE_THRESHOLD)) / (MAX_SIMILARITY - anchor);
  return roundSimilarity(Math.min(MAX_SIMILARITY, Math.max(0, scaled)));
}

export function callerScaleToCosine(threshold: number): number {
  const anchor = HEURISTIC_COSINE_AT_DEFAULT_THRESHOLD;
  return threshold <= DEFAULT_DUPLICATE_THRESHOLD
    ? (threshold * anchor) / DEFAULT_DUPLICATE_THRESHOLD
    : anchor + ((threshold - DEFAULT_DUPLICATE_THRESHOLD) * (MAX_SIMILARITY - anchor)) / (MAX_SIMILARITY - DEFAULT_DUPLICATE_THRESHOLD);
}

function toDuplicateCandidate(match: RankedMatch): DuplicateCandidate {
  const terms = match.terms.length > 0 ? match.terms.join(', ') : 'none';
  const rationale = `Keyword overlap (TF-IDF cosine ${match.similarity.toFixed(2)}, calibrated to the duplicate-threshold scale); shared terms: ${terms}. Heuristic match, not a language-model judgement.`;
  return {
    id: match.id,
    similarity: cosineToCallerScale(match.similarity),
    rationale: rationale.slice(0, DUPLICATE_RATIONALE_MAX_LENGTH),
  };
}

// The caller's threshold is translated to the cosine scale for ranking, and the reported
// similarity back to the caller's scale, so every returned candidate satisfies `>= threshold`.
export function findHeuristicDuplicates(options: RankSimilarOptions): DuplicateCandidate[] {
  return rankSimilarRequests({ ...options, threshold: callerScaleToCosine(options.threshold) })
    .map(toDuplicateCandidate)
    .filter((candidate) => candidate.similarity >= options.threshold);
}
