import { Inject, Injectable } from '@nestjs/common';
import { BriefSubject, DecisionBrief, IntelligenceService, ListBriefsQuery, ListBriefsResponse, RecordBriefDecisionBody } from '@fis/shared';
import { Clock, IdFactory } from '../common/clock';
import { ConflictError, NotFoundError } from '../common/domain-errors';
import { appLogger } from '../common/json-logger';
import { DecisionBriefEntity } from '../database/entities';
import { TransactionScope, UnitOfWork } from '../database/unit-of-work';
import { BUDGETED_INTELLIGENCE_SERVICE } from '../ai-budget/ai-budget.module';
import { BriefSubjectLoader } from './brief-subject.loader';
import { toDecisionBrief, toNewBriefEntity } from './brief.mapper';
import { BriefsRepository } from './briefs.repository';

export const BRIEF_RESOURCE = 'Decision brief';

@Injectable()
export class BriefsService {
  constructor(
    private readonly briefsRepository: BriefsRepository,
    private readonly subjectLoader: BriefSubjectLoader,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly idFactory: IdFactory,
    @Inject(BUDGETED_INTELLIGENCE_SERVICE) private readonly intelligence: IntelligenceService,
  ) {}

  async create(subject: BriefSubject): Promise<DecisionBrief> {
    const context = await this.subjectLoader.load(subject);
    const output = await this.intelligence.draftBrief({ subject, ...context });
    const entity = toNewBriefEntity({ id: this.idFactory.newId(), subject, output, createdAt: this.clock.nowIso() });
    await this.briefsRepository.insert(entity);
    appLogger.event('info', 'brief.drafted', { briefId: entity.id, provider: entity.provider, promptVersion: entity.promptVersion });
    return toDecisionBrief(entity);
  }

  async list(query: ListBriefsQuery): Promise<ListBriefsResponse> {
    const entities = await this.briefsRepository.list(query);
    return { items: entities.map(toDecisionBrief) };
  }

  // A decided brief is immutable (ADR 0004): re-deciding is a conflict, never an overwrite.
  decide(id: string, body: RecordBriefDecisionBody): Promise<DecisionBrief> {
    return this.unitOfWork.run(async (scope) => {
      await this.requireEntity(id, scope);
      const recorded = await this.briefsRepository.recordDecision(
        id,
        { status: body.status, decidedBy: body.decidedBy, decidedAt: this.clock.nowIso(), decisionNote: body.decisionNote ?? null },
        scope,
      );
      if (!recorded) {
        throw new ConflictError('This decision brief has already been decided');
      }
      appLogger.event('info', 'brief.decided', { briefId: id, status: body.status });
      return toDecisionBrief(await this.requireEntity(id, scope));
    });
  }

  async requireEntity(id: string, scope?: TransactionScope): Promise<DecisionBriefEntity> {
    const entity = await this.briefsRepository.findById(id, scope);
    if (entity === null) {
      throw new NotFoundError(BRIEF_RESOURCE, id);
    }
    return entity;
  }
}
