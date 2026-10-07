import { Inject, Injectable } from '@nestjs/common';
import {
  Audience,
  IntelligenceService,
  ListStakeholderDraftsResponse,
  StakeholderDraft,
  UpdateStakeholderDraftBody,
} from '@fis/shared';
import { Clock, IdFactory } from '../common/clock';
import { ConflictError, NotFoundError } from '../common/domain-errors';
import { appLogger } from '../common/json-logger';
import { StakeholderDraftEntity } from '../database/entities';
import { TransactionScope, UnitOfWork } from '../database/unit-of-work';
import { BUDGETED_INTELLIGENCE_SERVICE } from '../ai-budget/ai-budget.module';
import { BriefSubjectLoader } from './brief-subject.loader';
import { toBriefSubject, toModelSafeBrief } from './brief.mapper';
import { BriefsService } from './briefs.service';
import { toNewDraftEntity, toStakeholderDraft } from './stakeholder-draft.mapper';
import { StakeholderDraftChanges, StakeholderDraftsRepository } from './stakeholder-drafts.repository';

const DRAFT_RESOURCE = 'Stakeholder draft';
const APPROVED_BRIEF_STATUS = 'approved';
const APPROVED_DRAFT_CONFLICT_MESSAGE = 'An approved stakeholder draft is immutable';

@Injectable()
export class StakeholderDraftsService {
  constructor(
    private readonly draftsRepository: StakeholderDraftsRepository,
    private readonly briefsService: BriefsService,
    private readonly subjectLoader: BriefSubjectLoader,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly idFactory: IdFactory,
    @Inject(BUDGETED_INTELLIGENCE_SERVICE) private readonly intelligence: IntelligenceService,
  ) {}

  // Communication follows a human decision: drafts exist only for approved briefs.
  async create(briefId: string, audience: Audience): Promise<StakeholderDraft> {
    const briefEntity = await this.briefsService.requireEntity(briefId);
    if (briefEntity.status !== APPROVED_BRIEF_STATUS) {
      throw new ConflictError('Stakeholder drafts can only be generated for an approved brief');
    }
    const brief = toModelSafeBrief(briefEntity);
    const requests = await this.subjectLoader.loadRequestsForDraft(toBriefSubject(briefEntity));
    const output = await this.intelligence.draftStakeholderMessage({ brief, audience, requests });
    const entity = toNewDraftEntity({ id: this.idFactory.newId(), briefId, audience, output, createdAt: this.clock.nowIso() });
    await this.draftsRepository.insert(entity);
    appLogger.event('info', 'stakeholder_draft.generated', {
      draftId: entity.id,
      briefId,
      audience,
      provider: entity.provider,
      promptVersion: entity.promptVersion,
    });
    return toStakeholderDraft(entity);
  }

  async listForBrief(briefId: string): Promise<ListStakeholderDraftsResponse> {
    await this.briefsService.requireEntity(briefId);
    const entities = await this.draftsRepository.findByBriefId(briefId);
    return { items: entities.map(toStakeholderDraft) };
  }

  // An approved draft is immutable, like a decided brief (ADR 0004): editing it is a conflict, never an overwrite.
  update(id: string, body: UpdateStakeholderDraftBody): Promise<StakeholderDraft> {
    return this.unitOfWork.run(async (scope) => {
      await this.requireDraft(id, scope);
      const updated = await this.draftsRepository.updateEditable(id, this.toChanges(body), scope);
      if (!updated) {
        throw new ConflictError(APPROVED_DRAFT_CONFLICT_MESSAGE);
      }
      const saved = await this.requireDraft(id, scope);
      appLogger.event('info', 'stakeholder_draft.updated', { draftId: id, status: saved.status });
      return toStakeholderDraft(saved);
    });
  }

  private toChanges(body: UpdateStakeholderDraftBody): StakeholderDraftChanges {
    const changes: StakeholderDraftChanges = { updatedBy: body.updatedBy, updatedAt: this.clock.nowIso() };
    if (body.body !== undefined) {
      changes.body = body.body;
    }
    if (body.status !== undefined) {
      changes.status = body.status;
    }
    return changes;
  }

  private async requireDraft(id: string, scope: TransactionScope): Promise<StakeholderDraftEntity> {
    const entity = await this.draftsRepository.findById(id, scope);
    if (entity === null) {
      throw new NotFoundError(DRAFT_RESOURCE, id);
    }
    return entity;
  }
}
