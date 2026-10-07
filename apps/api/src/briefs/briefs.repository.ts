import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BriefDecisionStatus, BriefStatus, ListBriefsQuery } from '@fis/shared';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { DecisionBriefEntity } from '../database/entities';
import { TransactionScope } from '../database/unit-of-work';

export type BriefDecision = {
  status: BriefDecisionStatus;
  decidedBy: string;
  decidedAt: string;
  decisionNote: string | null;
};

const UNDECIDED_STATUS: BriefStatus = 'draft';
// The list contract is unpaginated, so the read-back is capped rather than unbounded.
export const BRIEF_LIST_LIMIT = 100;

@Injectable()
export class BriefsRepository extends DefaultTypeOrmRepository<DecisionBriefEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, DecisionBriefEntity);
  }

  async insert(entity: DecisionBriefEntity): Promise<void> {
    await this.repository().insert(entity);
  }

  findById(id: string, scope?: TransactionScope): Promise<DecisionBriefEntity | null> {
    return this.repository(scope).findOneBy({ id });
  }

  list(filter: ListBriefsQuery): Promise<DecisionBriefEntity[]> {
    return this.repository().find({
      where: { themeId: filter.themeId, featureRequestId: filter.featureRequestId, status: filter.status },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: BRIEF_LIST_LIMIT,
    });
  }

  // Conditional on the brief still being undecided, so two concurrent decisions cannot both succeed.
  async recordDecision(id: string, decision: BriefDecision, scope: TransactionScope): Promise<boolean> {
    const result = await this.repository(scope).update({ id, status: UNDECIDED_STATUS }, decision);
    return (result.affected ?? 0) > 0;
  }
}
