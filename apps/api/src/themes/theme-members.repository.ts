import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { ThemeMemberEntity } from '../database/entities';
import { TransactionScope } from '../database/unit-of-work';

@Injectable()
export class ThemeMembersRepository extends DefaultTypeOrmRepository<ThemeMemberEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, ThemeMemberEntity);
  }

  findAll(): Promise<ThemeMemberEntity[]> {
    return this.repository().find({ order: { themeId: 'ASC', featureRequestId: 'ASC' } });
  }

  findByTheme(themeId: string): Promise<ThemeMemberEntity[]> {
    return this.repository().find({ where: { themeId }, order: { featureRequestId: 'ASC' } });
  }

  async deleteAll(scope: TransactionScope): Promise<void> {
    await this.repository(scope).createQueryBuilder().delete().from(ThemeMemberEntity).execute();
  }

  async insertMany(members: ThemeMemberEntity[], scope: TransactionScope): Promise<void> {
    if (members.length === 0) {
      return;
    }
    await this.repository(scope).insert(members);
  }
}
