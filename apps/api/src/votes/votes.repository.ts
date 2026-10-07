import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { VoteEntity } from '../database/entities';
import { TransactionScope } from '../database/unit-of-work';

@Injectable()
export class VotesRepository extends DefaultTypeOrmRepository<VoteEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, VoteEntity);
  }

  async exists(featureRequestId: string, voterKey: string, scope: TransactionScope): Promise<boolean> {
    return this.repository(scope).existsBy({ featureRequestId, voterKey });
  }

  async insert(vote: VoteEntity, scope: TransactionScope): Promise<void> {
    await this.repository(scope).insert(vote);
  }

  async remove(featureRequestId: string, voterKey: string, scope: TransactionScope): Promise<number> {
    const result = await this.repository(scope).delete({ featureRequestId, voterKey });
    return result.affected ?? 0;
  }

  countForRequest(featureRequestId: string, scope: TransactionScope): Promise<number> {
    return this.repository(scope).countBy({ featureRequestId });
  }

  // Re-points source votes whose voter has not voted on the target, then discards the remaining duplicates.
  async moveDistinctVotes(sourceId: string, targetId: string, scope: TransactionScope): Promise<void> {
    await this.repository(scope)
      .createQueryBuilder()
      .update(VoteEntity)
      .set({ featureRequestId: targetId })
      .where('feature_request_id = :sourceId', { sourceId })
      .andWhere('voter_key NOT IN (SELECT target_votes.voter_key FROM votes target_votes WHERE target_votes.feature_request_id = :targetId)', {
        targetId,
      })
      .execute();
    await this.repository(scope).delete({ featureRequestId: sourceId });
  }
}
