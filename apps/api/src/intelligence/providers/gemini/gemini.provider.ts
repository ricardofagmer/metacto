import { GoogleGenAI } from '@google/genai';
import {
  AnalyzeInput,
  AnalyzeOutput,
  BRIEF_LIST_MAX_ITEMS,
  ClusterInput,
  ClusterOutput,
  DEFAULT_DUPLICATE_LIMIT,
  DEFAULT_DUPLICATE_THRESHOLD,
  DRAFT_BODY_MAX_LENGTH,
  DraftBriefInput,
  DraftBriefOutput,
  DraftStakeholderInput,
  DraftStakeholderOutput,
  FindDuplicatesInput,
  FindDuplicatesOutput,
  IntelligenceService,
  RequestSummary,
  ScorePriorityInput,
  ScorePriorityOutput,
} from '@fis/shared';
import { PromptTemplate, loadPrompt, renderTemplate } from '../../prompts/prompt-loader';
import { RequestText, buildRequestRefs } from '../../prompts/prompt-data';
import { toStakeholderBriefView } from '../../prompts/stakeholder-brief.mapper';
import { ensureValidOutput } from '../output-guard';
import { rankSimilarRequests } from '../heuristic/heuristic-dedupe';
import { buildBriefMessage, buildCandidateMessage, buildClusterMessage, buildScoreMessage, buildStakeholderMessage, describeWeights } from './gemini-messages';
import { checkCandidateRefs, checkThemeRefs, toDuplicateCandidates, toPriorityScore, toThemes } from './gemini-output.mappers';
import { GeminiStructuredCaller } from './gemini-structured-call';
import { GEMINI_TOOLS, MAX_OUTPUT_TOKENS } from './gemini-tools';

export type GeminiProviderOptions = {
  apiKey: string;
  model: string;
};

const PROVIDER = 'gemini';
const REQUEST_TIMEOUT_MS = 30_000;
// SDK-level attempts, original included, with exponential backoff on 408/429/5xx.
const TRANSPORT_ATTEMPTS = 3;
// TF-IDF preselects this many candidates; the model judges only those, which bounds tokens per call.
const CANDIDATE_POOL_SIZE = 40;

type Prompts = Record<'analyze' | 'dedupe' | 'cluster' | 'score' | 'brief' | 'stakeholder', PromptTemplate>;

/**
 * Gemini adapter for the port (ADR 0003, 0006). One forced side-effect-free function call, output
 * zod-validated with one corrective retry, request text delimited and escaped as data. Scores
 * are recomputed by the application from the model's per-criterion breakdown (ADR 0007).
 */
export class GeminiProvider implements IntelligenceService {
  readonly provider = PROVIDER;
  readonly model: string;
  private readonly caller: GeminiStructuredCaller;
  private readonly prompts: Prompts;

  constructor(options: GeminiProviderOptions) {
    this.model = options.model;
    const client = new GoogleGenAI({ apiKey: options.apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: { attempts: TRANSPORT_ATTEMPTS } } });
    this.caller = new GeminiStructuredCaller({ client, model: options.model });
    // Loaded at construction so a missing or mis-versioned prompt file fails the boot, not a request.
    this.prompts = {
      analyze: loadPrompt('analyze'),
      dedupe: loadPrompt('dedupe'),
      cluster: loadPrompt('cluster'),
      score: loadPrompt('score'),
      brief: loadPrompt('brief'),
      stakeholder: loadPrompt('stakeholder'),
    };
  }

  async findDuplicates(input: FindDuplicatesInput): Promise<FindDuplicatesOutput> {
    const prompt = this.prompts.dedupe;
    const tool = GEMINI_TOOLS.findDuplicates;
    const pool = this.candidatePool(input.request, input.corpus);
    const refs = buildRequestRefs(pool.map((entry) => entry.id));
    const allowed = new Set(pool.map((entry) => refs.refOf(entry.id)));
    const output = await this.caller.call({
      capability: 'findDuplicates',
      promptVersion: prompt.version,
      system: renderTemplate(prompt.system, { toolName: tool.name }),
      userContent: buildCandidateMessage({ task: renderTemplate(prompt.task, { threshold: input.threshold, limit: input.limit }), target: input.request, candidates: pool, refs }),
      tool,
      maxOutputTokens: MAX_OUTPUT_TOKENS.findDuplicates,
      checkSemantics: (result) => checkCandidateRefs(result.candidates, allowed),
    });
    const candidates = toDuplicateCandidates(output.candidates, refs, { threshold: input.threshold, limit: input.limit });
    return ensureValidOutput(
      FindDuplicatesOutput,
      { candidates, provider: PROVIDER, model: this.model, promptVersion: prompt.version },
      { capability: 'findDuplicates', provider: PROVIDER },
    );
  }

  async analyze(input: AnalyzeInput): Promise<AnalyzeOutput> {
    const prompt = this.prompts.analyze;
    const tool = GEMINI_TOOLS.analyze;
    const pool = this.candidatePool(input.request, input.corpus);
    const refs = buildRequestRefs(pool.map((entry) => entry.id));
    const allowed = new Set(pool.map((entry) => refs.refOf(entry.id)));
    const task = renderTemplate(prompt.task, { threshold: DEFAULT_DUPLICATE_THRESHOLD, limit: DEFAULT_DUPLICATE_LIMIT, weights: describeWeights() });
    const output = await this.caller.call({
      capability: 'analyze',
      promptVersion: prompt.version,
      system: renderTemplate(prompt.system, { toolName: tool.name }),
      userContent: buildCandidateMessage({ task, target: input.request, candidates: pool, refs }),
      tool,
      maxOutputTokens: MAX_OUTPUT_TOKENS.analyze,
      checkSemantics: (result) => checkCandidateRefs(result.duplicateCandidates, allowed),
    });
    const voteCount = input.corpus.find((entry) => entry.id === input.request.id)?.voteCount ?? 0;
    const maxVoteCount = input.corpus.reduce((max, entry) => Math.max(max, entry.voteCount), voteCount);
    return ensureValidOutput(
      AnalyzeOutput,
      {
        featureRequestId: input.request.id,
        underlyingNeed: output.underlyingNeed,
        duplicateCandidates: toDuplicateCandidates(output.duplicateCandidates, refs, { threshold: DEFAULT_DUPLICATE_THRESHOLD, limit: DEFAULT_DUPLICATE_LIMIT }),
        priority: toPriorityScore({ breakdown: output.breakdown, rationale: output.rationale, voteCount, maxVoteCount }),
        provider: PROVIDER,
        model: this.model,
        promptVersion: prompt.version,
      },
      { capability: 'analyze', provider: PROVIDER },
    );
  }

  async scorePriority(input: ScorePriorityInput): Promise<ScorePriorityOutput> {
    const prompt = this.prompts.score;
    const tool = GEMINI_TOOLS.scorePriority;
    const output = await this.caller.call({
      capability: 'scorePriority',
      promptVersion: prompt.version,
      system: renderTemplate(prompt.system, { toolName: tool.name }),
      userContent: buildScoreMessage({
        task: renderTemplate(prompt.task, { weights: describeWeights() }),
        request: input.request,
        underlyingNeed: input.underlyingNeed,
        maxVoteCount: input.maxVoteCount,
        corpusSize: input.corpusSize,
      }),
      tool,
      maxOutputTokens: MAX_OUTPUT_TOKENS.scorePriority,
    });
    const priority = toPriorityScore({ breakdown: output.breakdown, rationale: output.rationale, voteCount: input.request.voteCount, maxVoteCount: input.maxVoteCount });
    return ensureValidOutput(
      ScorePriorityOutput,
      { priority, provider: PROVIDER, model: this.model, promptVersion: prompt.version },
      { capability: 'scorePriority', provider: PROVIDER },
    );
  }

  async cluster(input: ClusterInput): Promise<ClusterOutput> {
    const prompt = this.prompts.cluster;
    const tool = GEMINI_TOOLS.cluster;
    const refs = buildRequestRefs(input.requests.map((request) => request.id));
    const allowed = new Set(input.requests.map((request) => refs.refOf(request.id)));
    const output = await this.caller.call({
      capability: 'cluster',
      promptVersion: prompt.version,
      system: renderTemplate(prompt.system, { toolName: tool.name }),
      userContent: buildClusterMessage(renderTemplate(prompt.task, { maxThemes: input.maxThemes }), input.requests, refs),
      tool,
      maxOutputTokens: MAX_OUTPUT_TOKENS.cluster,
      checkSemantics: (result) => checkThemeRefs(result, allowed, input.maxThemes),
    });
    const themes = toThemes(output, refs).map((theme) => ({ ...theme, provider: PROVIDER }));
    return ensureValidOutput(ClusterOutput, { themes, provider: PROVIDER, model: this.model, promptVersion: prompt.version }, { capability: 'cluster', provider: PROVIDER });
  }

  async draftBrief(input: DraftBriefInput): Promise<DraftBriefOutput> {
    const prompt = this.prompts.brief;
    const tool = GEMINI_TOOLS.draftBrief;
    const refs = buildRequestRefs(input.requests.map((request) => request.id));
    const output = await this.caller.call({
      capability: 'draftBrief',
      promptVersion: prompt.version,
      system: renderTemplate(prompt.system, { toolName: tool.name }),
      userContent: buildBriefMessage({
        task: renderTemplate(prompt.task, { maxItems: BRIEF_LIST_MAX_ITEMS }),
        requests: input.requests,
        analyses: input.analyses,
        theme: input.theme,
        refs,
      }),
      tool,
      maxOutputTokens: MAX_OUTPUT_TOKENS.draftBrief,
    });
    return ensureValidOutput(
      DraftBriefOutput,
      { ...output, provider: PROVIDER, model: this.model, promptVersion: prompt.version },
      { capability: 'draftBrief', provider: PROVIDER },
    );
  }

  async draftStakeholderMessage(input: DraftStakeholderInput): Promise<DraftStakeholderOutput> {
    const prompt = this.prompts.stakeholder;
    const tool = GEMINI_TOOLS.draftStakeholderMessage;
    const refs = buildRequestRefs(input.requests.map((request) => request.id));
    const output = await this.caller.call({
      capability: 'draftStakeholderMessage',
      promptVersion: prompt.version,
      system: renderTemplate(prompt.system, { toolName: tool.name }),
      userContent: buildStakeholderMessage({
        task: renderTemplate(prompt.task, { audience: input.audience, maxLength: DRAFT_BODY_MAX_LENGTH }),
        brief: toStakeholderBriefView(input.brief),
        requests: input.requests,
        refs,
      }),
      tool,
      maxOutputTokens: MAX_OUTPUT_TOKENS.draftStakeholderMessage,
    });
    return ensureValidOutput(
      DraftStakeholderOutput,
      { body: output.body, provider: PROVIDER, model: this.model, promptVersion: prompt.version },
      { capability: 'draftStakeholderMessage', provider: PROVIDER },
    );
  }

  private candidatePool(request: RequestText, corpus: RequestSummary[]): RequestSummary[] {
    const ranked = rankSimilarRequests({ request, corpus, threshold: 0, limit: CANDIDATE_POOL_SIZE });
    const byId = new Map(corpus.map((entry) => [entry.id, entry]));
    return ranked.flatMap((match) => {
      const entry = byId.get(match.id);
      return entry === undefined ? [] : [entry];
    });
  }
}
