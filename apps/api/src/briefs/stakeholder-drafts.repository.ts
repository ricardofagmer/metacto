import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DraftStatus } from '@fis/shared';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { StakeholderDraftEntity } from '../database/entities';
import { TransactionScope } from '../database/unit-of-work';

const EDITABLE_DRAFT_STATUS = DraftStatus.enum.draft;

export type StakeholderDraftChanges = Partial<Pick<StakeholderDraftEntity, 'body' | 'status'>> &
  Pick<StakeholderDraftEntity, 'updatedBy' | 'updatedAt'>;

@Injectable()
export class StakeholderDraftsRepository extends DefaultTypeOrmRepository<StakeholderDraftEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, StakeholderDraftEntity);
  }

  async insert(entity: StakeholderDraftEntity): Promise<void> {
    await this.repository().insert(entity);
  }

  findById(id: string, scope?: TransactionScope): Promise<StakeholderDraftEntity | null> {
    return this.repository(scope).findOneBy({ id });
  }

  findByBriefId(briefId: string): Promise<StakeholderDraftEntity[]> {
    return this.repository().find({ where: { briefId }, order: { createdAt: 'DESC', id: 'ASC' } });
  }

  // Conditional on the editable status so a concurrent approval can never be overwritten; false means it was approved.
  async updateEditable(id: string, changes: StakeholderDraftChanges, scope: TransactionScope): Promise<boolean> {
    const result = await this.repository(scope).update({ id, status: EDITABLE_DRAFT_STATUS }, changes);
    return (result.affected ?? 0) > 0;
  }
}
