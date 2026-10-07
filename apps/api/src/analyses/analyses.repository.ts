import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { PriorityProvenance } from './priority-provenance';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { AnalysisEntity } from '../database/entities';

@Injectable()
export class AnalysesRepository extends DefaultTypeOrmRepository<AnalysisEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, AnalysisEntity);
  }

  findByRequestId(featureRequestId: string): Promise<AnalysisEntity | null> {
    return this.repository().findOneBy({ featureRequestId });
  }

  findByRequestIds(featureRequestIds: string[]): Promise<AnalysisEntity[]> {
    if (featureRequestIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository().findBy({ featureRequestId: In(featureRequestIds) });
  }

  async findPriorityProvenance(featureRequestIds: string[]): Promise<Map<string, PriorityProvenance>> {
    if (featureRequestIds.length === 0) {
      return new Map();
    }
    const rows = await this.repository().find({
      select: { featureRequestId: true, priorityScore: true, provider: true, model: true },
      where: { featureRequestId: In(featureRequestIds) },
    });
    return new Map(
      rows.map((row) => [row.featureRequestId, { score: row.priorityScore, provider: row.provider, model: row.model ?? undefined }]),
    );
  }

  // One row per request: re-analysis replaces the previous result.
  async upsert(entity: AnalysisEntity): Promise<void> {
    await this.repository().upsert(entity, ['featureRequestId']);
  }
}
