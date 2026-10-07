import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { FeatureRequestDecisionEntity } from '../database/entities';
import { TransactionScope } from '../database/unit-of-work';

// Insert is the only write exposed: the log is append-only, and a scope is required so it commits with the decision.
@Injectable()
export class FeatureRequestDecisionsRepository extends DefaultTypeOrmRepository<FeatureRequestDecisionEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, FeatureRequestDecisionEntity);
  }

  async append(entity: FeatureRequestDecisionEntity, scope: TransactionScope): Promise<void> {
    await this.repository(scope).insert(entity);
  }
}
