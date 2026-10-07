import {
  AnalyzeInput,
  AnalyzeOutput,
  ClusterInput,
  ClusterOutput,
  DEFAULT_DUPLICATE_LIMIT,
  DEFAULT_DUPLICATE_THRESHOLD,
  DraftBriefInput,
  DraftBriefOutput,
  DraftStakeholderInput,
  DraftStakeholderOutput,
  FindDuplicatesInput,
  FindDuplicatesOutput,
  IntelligenceService,
  ScorePriorityInput,
  ScorePriorityOutput,
} from '@fis/shared';
import { ensureValidOutput } from '../output-guard';
import { clusterRequests } from './heuristic-cluster';
import { findHeuristicDuplicates } from './heuristic-dedupe';
import { extractUnderlyingNeed } from './heuristic-need';
import { scoreWithKeywordRules } from './heuristic-scoring';
import { draftBriefFromTemplate, draftStakeholderFromTemplate } from './heuristic-templates';
import { HEURISTIC_VERSIONS } from './heuristic-versions';
import { toStakeholderBriefView } from '../../prompts/stakeholder-brief.mapper';

const PROVIDER = 'heuristic';

/**
 * Deterministic, in-process implementation of the port (ADR 0003). No network, no model:
 * TF-IDF cosine for duplicates (calibrated to the port's threshold scale) and clustering,
 * documented keyword rules for scoring, templates for text. Every output is labelled `heuristic` and carries no `model`, so it can never be
 * mistaken for LLM output.
 */
export class HeuristicProvider implements IntelligenceService {
  readonly provider = PROVIDER;

  async findDuplicates(input: FindDuplicatesInput): Promise<FindDuplicatesOutput> {
    const candidates = findHeuristicDuplicates({
      request: input.request,
      corpus: input.corpus,
      threshold: input.threshold,
      limit: input.limit,
    });
    return ensureValidOutput(
      FindDuplicatesOutput,
      { candidates, provider: PROVIDER, promptVersion: HEURISTIC_VERSIONS.findDuplicates },
      { capability: 'findDuplicates', provider: PROVIDER },
    );
  }

  async cluster(input: ClusterInput): Promise<ClusterOutput> {
    const themes = clusterRequests(input.requests, input.maxThemes).map((theme) => ({ ...theme, provider: PROVIDER }));
    return ensureValidOutput(
      ClusterOutput,
      { themes, provider: PROVIDER, promptVersion: HEURISTIC_VERSIONS.cluster },
      { capability: 'cluster', provider: PROVIDER },
    );
  }

  async scorePriority(input: ScorePriorityInput): Promise<ScorePriorityOutput> {
    const priority = scoreWithKeywordRules({
      text: `${input.request.title}\n${input.request.description}\n${input.underlyingNeed}`,
      voteCount: input.request.voteCount,
      maxVoteCount: input.maxVoteCount,
    });
    return ensureValidOutput(
      ScorePriorityOutput,
      { priority, provider: PROVIDER, promptVersion: HEURISTIC_VERSIONS.scorePriority },
      { capability: 'scorePriority', provider: PROVIDER },
    );
  }

  async analyze(input: AnalyzeInput): Promise<AnalyzeOutput> {
    const underlyingNeed = extractUnderlyingNeed(input.request);
    const duplicateCandidates = findHeuristicDuplicates({
      request: input.request,
      corpus: input.corpus,
      threshold: DEFAULT_DUPLICATE_THRESHOLD,
      limit: DEFAULT_DUPLICATE_LIMIT,
    });
    // The request text carries no vote count; the corpus row for the same id is the source of truth.
    const voteCount = input.corpus.find((entry) => entry.id === input.request.id)?.voteCount ?? 0;
    const maxVoteCount = input.corpus.reduce((max, entry) => Math.max(max, entry.voteCount), voteCount);
    const priority = scoreWithKeywordRules({
      text: `${input.request.title}\n${input.request.description}\n${underlyingNeed}`,
      voteCount,
      maxVoteCount,
    });
    return ensureValidOutput(
      AnalyzeOutput,
      {
        featureRequestId: input.request.id,
        underlyingNeed,
        duplicateCandidates,
        priority,
        provider: PROVIDER,
        promptVersion: HEURISTIC_VERSIONS.analyze,
      },
      { capability: 'analyze', provider: PROVIDER },
    );
  }

  async draftBrief(input: DraftBriefInput): Promise<DraftBriefOutput> {
    const draft = draftBriefFromTemplate({ requests: input.requests, analyses: input.analyses, theme: input.theme });
    return ensureValidOutput(
      DraftBriefOutput,
      { ...draft, provider: PROVIDER, promptVersion: HEURISTIC_VERSIONS.draftBrief },
      { capability: 'draftBrief', provider: PROVIDER },
    );
  }

  async draftStakeholderMessage(input: DraftStakeholderInput): Promise<DraftStakeholderOutput> {
    // The stored draft is built from the name-free view, so the decider's name is never persisted in it.
    const body = draftStakeholderFromTemplate({ brief: toStakeholderBriefView(input.brief), audience: input.audience, requests: input.requests });
    return ensureValidOutput(
      DraftStakeholderOutput,
      { body, provider: PROVIDER, promptVersion: HEURISTIC_VERSIONS.draftStakeholderMessage },
      { capability: 'draftStakeholderMessage', provider: PROVIDER },
    );
  }
}
