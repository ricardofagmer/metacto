import { Injectable } from '@nestjs/common';
import { VoteBody, VoteCountResponse } from '@fis/shared';
import { ConflictError, NotFoundError } from '../common/domain-errors';
import { UnitOfWork } from '../database/unit-of-work';
import { VotesService } from '../votes/votes.service';
import { MERGED_STATUS } from './feature-requests.constants';
import { FeatureRequestsRepository } from './feature-requests.repository';
import { FeatureRequestsService } from './feature-requests.service';

const VOTE_RESOURCE = 'Vote on feature request';

// Keeps the denormalised voteCount equal to the vote ledger inside the same transaction.
@Injectable()
export class FeatureRequestVotesService {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly featureRequestsRepository: FeatureRequestsRepository,
    private readonly votesService: VotesService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  addVote(id: string, body: VoteBody): Promise<VoteCountResponse> {
    return this.unitOfWork.run(async (scope) => {
      const request = await this.featureRequestsService.requireEntity(id, scope);
      if (request.status === MERGED_STATUS) {
        throw new ConflictError('This feature request was merged; vote on the request it was merged into');
      }
      const voteCount = await this.votesService.addVote(id, body.voterKey, scope);
      await this.featureRequestsRepository.setVoteCount(id, voteCount, scope);
      return { voteCount };
    });
  }

  removeVote(id: string, body: VoteBody): Promise<VoteCountResponse> {
    return this.unitOfWork.run(async (scope) => {
      await this.featureRequestsService.requireEntity(id, scope);
      const result = await this.votesService.removeVote(id, body.voterKey, scope);
      if (!result.removed) {
        throw new NotFoundError(VOTE_RESOURCE, id);
      }
      await this.featureRequestsRepository.setVoteCount(id, result.voteCount, scope);
      return { voteCount: result.voteCount };
    });
  }
}
