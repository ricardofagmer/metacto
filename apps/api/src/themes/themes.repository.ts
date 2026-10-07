import { Injectable } from '@nestjs/common';
import { DataSource, In, Not } from 'typeorm';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { DecisionBriefEntity, ThemeEntity } from '../database/entities';
import { TransactionScope } from '../database/unit-of-work';

const BRIEF_ALIAS = 'brief';

@Injectable()
export class ThemesRepository extends DefaultTypeOrmRepository<ThemeEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, ThemeEntity);
  }

  findById(id: string): Promise<ThemeEntity | null> {
    return this.repository().findOneBy({ id });
  }

  findByIds(ids: string[]): Promise<ThemeEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository().find({ where: { id: In(ids) }, order: { createdAt: 'DESC', name: 'ASC' } });
  }

  async insertMany(themes: ThemeEntity[], scope: TransactionScope): Promise<void> {
    if (themes.length === 0) {
      return;
    }
    await this.repository(scope).insert(themes);
  }

  // Themes referenced by a decision brief survive re-clustering (resolved open question 2); others are removed.
  async deleteUnreferencedExcept(keepIds: string[], scope: TransactionScope): Promise<void> {
    const referenced = await scope
      .getRepository(DecisionBriefEntity)
      .createQueryBuilder(BRIEF_ALIAS)
      .select(`${BRIEF_ALIAS}.themeId`, 'themeId')
      .distinct(true)
      .where(`${BRIEF_ALIAS}.themeId IS NOT NULL`)
      .getRawMany<{ themeId: string }>();
    const protectedIds = [...new Set([...keepIds, ...referenced.map((row) => row.themeId)])];
    if (protectedIds.length === 0) {
      await this.repository(scope).createQueryBuilder().delete().from(ThemeEntity).execute();
      return;
    }
    await this.repository(scope).delete({ id: Not(In(protectedIds)) });
  }
}

