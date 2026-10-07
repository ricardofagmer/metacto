import { Injectable } from '@nestjs/common';
import { Clock, IdFactory } from '../common/clock';
import { ConflictError } from '../common/domain-errors';
import { VoteEntity } from '../database/entities';
import { isUniqueViolation } from '../database/query-errors';
import { TransactionScope } from '../database/unit-of-work';
import { VotesRepository } from './votes.repository';

const ALREADY_VOTED_MESSAGE = 'This voter has already voted for the feature request';

// Vote ledger operations; callers own the transaction and keep feature_requests.vote_count in step.
@Injectable()
export class VotesService {
  constructor(
    private readonly votesRepository: VotesRepository,
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
  ) {}

  async addVote(featureRequestId: string, voterKey: string, scope: TransactionScope): Promise<number> {
    if (await this.votesRepository.exists(featureRequestId, voterKey, scope)) {
      throw new ConflictError(ALREADY_VOTED_MESSAGE);
    }
    const vote = new VoteEntity();
    vote.id = this.idFactory.newId();
    vote.featureRequestId = featureRequestId;
    vote.voterKey = voterKey;
    vote.createdAt = this.clock.nowIso();
    try {
      await this.votesRepository.insert(vote, scope);
    } catch (error) {
      // A concurrent identical vote can win between the check and the insert; the unique index decides.
      if (isUniqueViolation(error)) {
        throw new ConflictError(ALREADY_VOTED_MESSAGE);
      }
      throw error;
    }
    return this.votesRepository.countForRequest(featureRequestId, scope);
  }

  async removeVote(featureRequestId: string, voterKey: string, scope: TransactionScope): Promise<{ removed: boolean; voteCount: number }> {
    const affected = await this.votesRepository.remove(featureRequestId, voterKey, scope);
    const voteCount = await this.votesRepository.countForRequest(featureRequestId, scope);
    return { removed: affected > 0, voteCount };
  }

  async moveVotesForMerge(sourceId: string, targetId: string, scope: TransactionScope): Promise<number> {
    await this.votesRepository.moveDistinctVotes(sourceId, targetId, scope);
    return this.votesRepository.countForRequest(targetId, scope);
  }
}
