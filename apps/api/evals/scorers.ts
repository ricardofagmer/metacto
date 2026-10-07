import { DEFAULT_DUPLICATE_THRESHOLD, DEFAULT_MAX_THEMES, DuplicateCandidate, IntelligenceService, MAX_DUPLICATE_LIMIT, SCORING_WEIGHTS } from '@fis/shared';
import { GoldenSet, findRequest } from './golden.schema';
import { NeedJudge } from './need-judge';

export type DedupeCaseResult = {
  name: string;
  passed: boolean;
  similarities: Map<string, number>;
  expected: string[];
  mustNotMatch: string[];
};

export type PrecisionRecall = { threshold: number; truePositives: number; falsePositives: number; falseNegatives: number; precision: number | null; recall: number | null };

export type DedupeReport = {
  cases: DedupeCaseResult[];
  atDefault: PrecisionRecall;
  sweep: PrecisionRecall[];
  nearMissViolations: number;
  separationChecks: { passed: number; total: number };
};

// The spec's separation targets: duplicates at or above 0.6, distinct pairs below 0.4. Every
// provider reports similarity on this caller scale; the heuristic calibrates its raw TF-IDF
// cosine onto it (HEURISTIC_COSINE_AT_DEFAULT_THRESHOLD), so the same cut applies to both.
const DUPLICATE_FLOOR = 0.6;
const DISTINCT_CEILING = 0.4;
const SWEEP_THRESHOLDS = [0.2, 0.3, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.8];

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function precisionRecall(cases: DedupeCaseResult[], threshold: number): PrecisionRecall {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  cases.forEach((result) => {
    const predicted = [...result.similarities.entries()].filter(([, similarity]) => similarity >= threshold).map(([id]) => id);
    truePositives += predicted.filter((id) => result.expected.includes(id)).length;
    falsePositives += predicted.filter((id) => !result.expected.includes(id)).length;
    falseNegatives += result.expected.filter((id) => !predicted.includes(id)).length;
  });
  return {
    threshold,
    truePositives,
    falsePositives,
    falseNegatives,
    precision: ratio(truePositives, truePositives + falsePositives),
    recall: ratio(truePositives, truePositives + falseNegatives),
  };
}

function toSimilarityMap(candidates: DuplicateCandidate[]): Map<string, number> {
  return new Map(candidates.map((candidate) => [candidate.id, candidate.similarity]));
}

// One call per case at threshold 0 and the maximum limit, so every threshold in the sweep is
// scored from the same provider answer instead of one paid call per threshold.
export async function evaluateDedupe(provider: IntelligenceService, golden: GoldenSet): Promise<DedupeReport> {
  const cases: DedupeCaseResult[] = [];
  for (const goldenCase of golden.dedupe) {
    const query = findRequest(golden, goldenCase.queryId);
    const output = await provider.findDuplicates({ request: query, corpus: golden.corpus, threshold: 0, limit: MAX_DUPLICATE_LIMIT });
    const similarities = toSimilarityMap(output.candidates);
    const returned = [...similarities.entries()].filter(([, similarity]) => similarity >= DEFAULT_DUPLICATE_THRESHOLD).map(([id]) => id);
    const passed = goldenCase.expectedDuplicates.every((id) => returned.includes(id)) && !goldenCase.mustNotMatch.some((id) => returned.includes(id));
    cases.push({ name: goldenCase.name, passed, similarities, expected: goldenCase.expectedDuplicates, mustNotMatch: goldenCase.mustNotMatch });
  }
  const checks = cases.flatMap((result) => [
    ...result.expected.map((id) => (result.similarities.get(id) ?? 0) >= DUPLICATE_FLOOR),
    ...result.mustNotMatch.map((id) => (result.similarities.get(id) ?? 0) < DISTINCT_CEILING),
  ]);
  return {
    cases,
    atDefault: precisionRecall(cases, DEFAULT_DUPLICATE_THRESHOLD),
    sweep: SWEEP_THRESHOLDS.map((threshold) => precisionRecall(cases, threshold)),
    nearMissViolations: cases.reduce((total, result) => total + result.mustNotMatch.filter((id) => (result.similarities.get(id) ?? 0) >= DEFAULT_DUPLICATE_THRESHOLD).length, 0),
    separationChecks: { passed: checks.filter(Boolean).length, total: checks.length },
  };
}

export type ScoringReport = {
  cases: Array<{ name: string; score: number; band: [number, number]; passed: boolean }>;
  orderings: Array<{ higher: string; lower: string; passed: boolean }>;
};

export async function evaluateScoring(provider: IntelligenceService, golden: GoldenSet): Promise<ScoringReport> {
  const scores = new Map<string, number>();
  const cases: ScoringReport['cases'] = [];
  for (const goldenCase of golden.scoring.cases) {
    const output = await provider.scorePriority({
      request: findRequest(golden, goldenCase.requestId),
      underlyingNeed: goldenCase.underlyingNeed,
      weights: SCORING_WEIGHTS,
      corpusSize: golden.scoring.corpusSize,
      maxVoteCount: golden.scoring.maxVoteCount,
    });
    const score = output.priority.score;
    scores.set(goldenCase.requestId, score);
    const [low, high] = goldenCase.expectedBand;
    cases.push({ name: goldenCase.name, score, band: [low, high], passed: score >= low && score <= high });
  }
  const orderings = golden.scoring.orderings.map(([higher, lower]) => ({
    higher: findRequest(golden, higher).title,
    lower: findRequest(golden, lower).title,
    passed: (scores.get(higher) ?? Number.NaN) > (scores.get(lower) ?? Number.NaN),
  }));
  return { cases, orderings };
}

export type NeedScorer = 'keyword-inclusion' | 'llm-judge';

export type NeedReport = {
  scorer: NeedScorer;
  cases: Array<{ name: string; missing: string[]; passed: boolean }>;
};

// Keyword inclusion is the pass criterion without a judge (heuristic: it quotes the requester
// verbatim). With a judge (gemini only) the judge decides, and missing keywords are kept as
// a diagnostic, because a model paraphrase can be right without the literal word.
export async function evaluateNeed(provider: IntelligenceService, golden: GoldenSet, judge?: NeedJudge): Promise<NeedReport> {
  const cases: NeedReport['cases'] = [];
  for (const goldenCase of golden.need) {
    const request = findRequest(golden, goldenCase.requestId);
    const output = await provider.analyze({ request, corpus: golden.corpus });
    const need = output.underlyingNeed.toLowerCase();
    const missing = goldenCase.expectedKeywords.filter((keyword) => !need.includes(keyword.toLowerCase()));
    if (judge === undefined) {
      cases.push({ name: goldenCase.name, missing, passed: missing.length === 0 });
      continue;
    }
    // The judge's reason can quote request text, which the report keeps out on purpose.
    const judgement = await judge({ request, candidateNeed: output.underlyingNeed, referenceConcepts: goldenCase.expectedKeywords });
    cases.push({ name: goldenCase.name, missing, passed: judgement.passed });
  }
  return { scorer: judge === undefined ? 'keyword-inclusion' : 'llm-judge', cases };
}

export type ClusterReport = { together: { passed: number; total: number }; apart: { passed: number; total: number }; themeCount: number };

export async function evaluateCluster(provider: IntelligenceService, golden: GoldenSet): Promise<ClusterReport> {
  const output = await provider.cluster({ requests: golden.corpus, maxThemes: DEFAULT_MAX_THEMES });
  const themeOf = new Map<string, number>();
  output.themes.forEach((theme, index) => theme.requestIds.forEach((id) => themeOf.set(id, index)));
  const sameTheme = ([left, right]: [string, string]): boolean => themeOf.has(left) && themeOf.get(left) === themeOf.get(right);
  return {
    together: { passed: golden.cluster.together.filter(sameTheme).length, total: golden.cluster.together.length },
    apart: { passed: golden.cluster.apart.filter((pair) => !sameTheme(pair)).length, total: golden.cluster.apart.length },
    themeCount: output.themes.length,
  };
}
