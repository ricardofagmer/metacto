import { Injectable } from '@nestjs/common';
import { MergeFeatureRequestBody, MergeFeatureRequestResponse } from '@fis/shared';
import { Clock, IdFactory } from '../common/clock';
import { ConflictError } from '../common/domain-errors';
import { appLogger } from '../common/json-logger';
import { UnitOfWork } from '../database/unit-of-work';
import { VotesService } from '../votes/votes.service';
import { toFeatureRequestDecisionEntity } from './feature-request-decision.mapper';
import { FeatureRequestDecisionsRepository } from './feature-request-decisions.repository';
import { toFeatureRequest } from './feature-request.mapper';
import { MERGE_DECISION_KIND, MERGED_STATUS } from './feature-requests.constants';
import { FeatureRequestsRepository } from './feature-requests.repository';
import { FeatureRequestsService } from './feature-requests.service';

// A human-only decision (ADR 0004): nothing on the AI path calls this service.
@Injectable()
export class FeatureRequestMergeService {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly featureRequestsRepository: FeatureRequestsRepository,
    private readonly decisionsRepository: FeatureRequestDecisionsRepository,
    private readonly votesService: VotesService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly idFactory: IdFactory,
  ) {}

  merge(sourceId: string, body: MergeFeatureRequestBody): Promise<MergeFeatureRequestResponse> {
    if (sourceId === body.targetId) {
      throw new ConflictError('A feature request cannot be merged into itself');
    }
    return this.unitOfWork.run(async (scope) => {
      const source = await this.featureRequestsService.requireEntity(sourceId, scope);
      const target = await this.featureRequestsService.requireEntity(body.targetId, scope);
      if (source.status === MERGED_STATUS) {
        throw new ConflictError('The source feature request is already merged');
      }
      if (target.status === MERGED_STATUS) {
        throw new ConflictError('The target feature request is merged; merge into its surviving request instead');
      }

      const targetVoteCount = await this.votesService.moveVotesForMerge(source.id, target.id, scope);
      const now = this.clock.nowIso();

      source.status = MERGED_STATUS;
      source.mergedIntoId = target.id;
      source.voteCount = 0;
      source.decidedBy = body.decidedBy;
      source.decidedAt = now;
      source.decisionNote = body.note ?? null;
      source.updatedAt = now;
      target.voteCount = targetVoteCount;
      target.updatedAt = now;

      const savedSource = await this.featureRequestsRepository.save(source, scope);
      const savedTarget = await this.featureRequestsRepository.save(target, scope);
      // Logged against the source: it is the request whose fate was decided; the target is in its mergedIntoId.
      await this.decisionsRepository.append(
        toFeatureRequestDecisionEntity({
          id: this.idFactory.newId(),
          featureRequestId: source.id,
          kind: MERGE_DECISION_KIND,
          decidedBy: body.decidedBy,
          note: source.decisionNote,
          createdAt: now,
        }),
        scope,
      );
      appLogger.event('info', 'feature_request.merged', { sourceId: source.id, targetId: target.id, targetVoteCount });
      return { source: toFeatureRequest(savedSource), target: toFeatureRequest(savedTarget) };
    });
  }
}
