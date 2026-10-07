import { Inject, Injectable } from '@nestjs/common';
import {
  CreateFeatureRequestBody,
  CreateFeatureRequestResponse,
  DEFAULT_DUPLICATE_LIMIT,
  DEFAULT_DUPLICATE_THRESHOLD,
  FeatureRequest,
  FindDuplicatesInput,
  GetFeatureRequestResponse,
  IntelligenceService,
  IntelligenceUnavailableError,
  ListFeatureRequestsQuery,
  ListFeatureRequestsResponse,
  RequestSummary,
  UpdateFeatureRequestStatusBody,
} from '@fis/shared';
import { Clock, IdFactory } from '../common/clock';
import { ConflictError, NotFoundError } from '../common/domain-errors';
import { appLogger } from '../common/json-logger';
import { FeatureRequestEntity } from '../database/entities';
import { TransactionScope, UnitOfWork } from '../database/unit-of-work';
import { AnalysesService } from '../analyses/analyses.service';
import { BUDGETED_INTELLIGENCE_SERVICE } from '../ai-budget/ai-budget.module';
import { HEURISTIC_INTELLIGENCE_SERVICE } from '../intelligence/intelligence.module';
import { toFeatureRequestDecisionEntity } from './feature-request-decision.mapper';
import { FeatureRequestDecisionsRepository } from './feature-request-decisions.repository';
import { toFeatureRequest, toFeatureRequestListItem, toRequestSummary } from './feature-request.mapper';
import { CORPUS_LIMIT, FEATURE_REQUEST_RESOURCE, INITIAL_STATUS, MERGED_STATUS, STATUS_DECISION_KIND } from './feature-requests.constants';
import { FeatureRequestsRepository } from './feature-requests.repository';

type DuplicateResult = Pick<CreateFeatureRequestResponse, 'duplicateCandidates' | 'provider'>;

@Injectable()
export class FeatureRequestsService {
  constructor(
    private readonly featureRequestsRepository: FeatureRequestsRepository,
    private readonly decisionsRepository: FeatureRequestDecisionsRepository,
    private readonly analysesService: AnalysesService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly idFactory: IdFactory,
    @Inject(BUDGETED_INTELLIGENCE_SERVICE) private readonly intelligence: IntelligenceService,
    @Inject(HEURISTIC_INTELLIGENCE_SERVICE) private readonly heuristicIntelligence: IntelligenceService,
  ) {}

  async create(body: CreateFeatureRequestBody): Promise<CreateFeatureRequestResponse> {
    const entity = this.newEntity(body);
    await this.unitOfWork.run((scope) => this.featureRequestsRepository.insert(entity, scope));
    const duplicates = await this.findDuplicatesFor(entity);
    return { request: toFeatureRequest(entity), ...duplicates };
  }

  async list(query: ListFeatureRequestsQuery): Promise<ListFeatureRequestsResponse> {
    const page = await this.featureRequestsRepository.list(query);
    const priorities = await this.analysesService.findPriorityProvenance(page.entities.map((entity) => entity.id));
    return {
      items: page.entities.map((entity) => toFeatureRequestListItem(entity, priorities.get(entity.id))),
      total: page.total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getDetail(id: string): Promise<GetFeatureRequestResponse> {
    const entity = await this.requireEntity(id);
    const [analysis, mergedRequests] = await Promise.all([
      this.analysesService.findForRequest(id),
      this.featureRequestsRepository.findMergedSourceIds(id),
    ]);
    return { request: toFeatureRequest(entity), analysis, votes: entity.voteCount, mergedRequests };
  }

  updateStatus(id: string, body: UpdateFeatureRequestStatusBody): Promise<FeatureRequest> {
    return this.unitOfWork.run(async (scope) => {
      const entity = await this.requireEntity(id, scope);
      if (entity.status === MERGED_STATUS) {
        throw new ConflictError('A merged feature request cannot change status; use the merge endpoint');
      }
      const now = this.clock.nowIso();
      entity.status = body.status;
      entity.decidedBy = body.decidedBy;
      entity.decidedAt = now;
      entity.decisionNote = body.note ?? null;
      entity.updatedAt = now;
      const saved = await this.featureRequestsRepository.save(entity, scope);
      await this.decisionsRepository.append(
        toFeatureRequestDecisionEntity({
          id: this.idFactory.newId(),
          featureRequestId: id,
          kind: STATUS_DECISION_KIND,
          decidedBy: body.decidedBy,
          note: entity.decisionNote,
          createdAt: now,
        }),
        scope,
      );
      appLogger.event('info', 'feature_request.status_changed', { featureRequestId: id, status: body.status });
      return toFeatureRequest(saved);
    });
  }

  async requireEntity(id: string, scope?: TransactionScope): Promise<FeatureRequestEntity> {
    const entity = await this.featureRequestsRepository.findById(id, scope);
    if (entity === null) {
      throw new NotFoundError(FEATURE_REQUEST_RESOURCE, id);
    }
    return entity;
  }

  async requireSummary(id: string): Promise<RequestSummary> {
    return toRequestSummary(await this.requireEntity(id));
  }

  async findSummariesByIds(ids: string[]): Promise<RequestSummary[]> {
    const entities = await this.featureRequestsRepository.findByIds(ids);
    return entities.map(toRequestSummary);
  }

  async loadCorpus(excludeId?: string): Promise<RequestSummary[]> {
    const entities = await this.featureRequestsRepository.findActive({ limit: CORPUS_LIMIT, excludeId });
    return entities.map(toRequestSummary);
  }

  clearThemeAssignments(scope: TransactionScope): Promise<void> {
    return this.featureRequestsRepository.clearAllThemes(scope);
  }

  assignTheme(ids: string[], themeId: string, scope: TransactionScope): Promise<void> {
    return this.featureRequestsRepository.assignTheme(ids, themeId, scope);
  }

  private newEntity(body: CreateFeatureRequestBody): FeatureRequestEntity {
    const now = this.clock.nowIso();
    const entity = new FeatureRequestEntity();
    entity.id = this.idFactory.newId();
    entity.title = body.title;
    entity.description = body.description;
    entity.authorName = body.authorName;
    entity.status = INITIAL_STATUS;
    entity.mergedIntoId = null;
    entity.themeId = null;
    entity.voteCount = 0;
    entity.decidedBy = null;
    entity.decidedAt = null;
    entity.decisionNote = null;
    entity.createdAt = now;
    entity.updatedAt = now;
    return entity;
  }

  // The request is already stored, so AI failure never fails the submit: the active provider falls back to the
  // in-process heuristic (spec step 2), and only if that also fails are no candidates returned.
  private async findDuplicatesFor(entity: FeatureRequestEntity): Promise<DuplicateResult> {
    const corpus = await this.loadCorpus(entity.id);
    const input: FindDuplicatesInput = {
      request: { id: entity.id, title: entity.title, description: entity.description },
      corpus,
      threshold: DEFAULT_DUPLICATE_THRESHOLD,
      limit: DEFAULT_DUPLICATE_LIMIT,
    };
    const knownIds = new Set(corpus.map((summary) => summary.id));
    const isHeuristicActive = this.intelligence.provider === this.heuristicIntelligence.provider;
    const providers = isHeuristicActive ? [this.intelligence] : [this.intelligence, this.heuristicIntelligence];
    let lastFailure: IntelligenceUnavailableError | undefined;
    for (const provider of providers) {
      try {
        const output = await provider.findDuplicates(input);
        return {
          duplicateCandidates: output.candidates.filter((candidate) => knownIds.has(candidate.id)),
          provider: output.provider,
        };
      } catch (error) {
        if (!(error instanceof IntelligenceUnavailableError)) {
          throw error;
        }
        lastFailure = error;
        appLogger.event('warn', 'feature_request.dedupe_unavailable', {
          featureRequestId: entity.id,
          provider: error.provider,
          capability: error.capability,
        });
      }
    }
    return { duplicateCandidates: [], provider: lastFailure?.provider ?? this.intelligence.provider };
  }
}
