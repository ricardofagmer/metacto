import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Not, SelectQueryBuilder } from 'typeorm';
import { ListFeatureRequestsQuery } from '@fis/shared';
import { DefaultTypeOrmRepository } from '../database/default-typeorm.repository';
import { AnalysisEntity, FeatureRequestEntity } from '../database/entities';
import { TransactionScope } from '../database/unit-of-work';
import { MERGED_STATUS } from './feature-requests.constants';

const LIST_ALIAS = 'request';
const ANALYSIS_ALIAS = 'analysis';
const LIKE_ESCAPE_PATTERN = /[\\%_]/g;

export type FeatureRequestPage = { entities: FeatureRequestEntity[]; total: number };

function toContainsPattern(search: string): string {
  return `%${search.toLowerCase().replace(LIKE_ESCAPE_PATTERN, (character) => `\\${character}`)}%`;
}

@Injectable()
export class FeatureRequestsRepository extends DefaultTypeOrmRepository<FeatureRequestEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, FeatureRequestEntity);
  }

  async insert(entity: FeatureRequestEntity, scope?: TransactionScope): Promise<void> {
    await this.repository(scope).insert(entity);
  }

  async save(entity: FeatureRequestEntity, scope?: TransactionScope): Promise<FeatureRequestEntity> {
    return this.repository(scope).save(entity);
  }

  findById(id: string, scope?: TransactionScope): Promise<FeatureRequestEntity | null> {
    return this.repository(scope).findOneBy({ id });
  }

  findByIds(ids: string[], scope?: TransactionScope): Promise<FeatureRequestEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository(scope).findBy({ id: In(ids) });
  }

  // Most recent non-merged requests, the corpus every AI capability works against.
  findActive(options: { limit: number; excludeId?: string }): Promise<FeatureRequestEntity[]> {
    const query = this.repository()
      .createQueryBuilder(LIST_ALIAS)
      .where(`${LIST_ALIAS}.status != :merged`, { merged: MERGED_STATUS })
      .orderBy(`${LIST_ALIAS}.createdAt`, 'DESC')
      .addOrderBy(`${LIST_ALIAS}.id`, 'ASC')
      .limit(options.limit);
    if (options.excludeId !== undefined) {
      query.andWhere(`${LIST_ALIAS}.id != :excludeId`, { excludeId: options.excludeId });
    }
    return query.getMany();
  }

  async findMergedSourceIds(targetId: string): Promise<string[]> {
    const sources = await this.repository().find({
      select: { id: true },
      where: { mergedIntoId: targetId },
      order: { createdAt: 'ASC' },
    });
    return sources.map((source) => source.id);
  }

  async list(query: ListFeatureRequestsQuery): Promise<FeatureRequestPage> {
    const builder = this.repository()
      .createQueryBuilder(LIST_ALIAS)
      .leftJoin(AnalysisEntity, ANALYSIS_ALIAS, `${ANALYSIS_ALIAS}.featureRequestId = ${LIST_ALIAS}.id`);
    this.applyFilters(builder, query);
    this.applySort(builder, query.sort);
    const [entities, total] = await builder
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getManyAndCount();
    return { entities, total };
  }

  async setVoteCount(id: string, voteCount: number, scope: TransactionScope): Promise<void> {
    await this.repository(scope).update({ id }, { voteCount });
  }

  async clearAllThemes(scope: TransactionScope): Promise<void> {
    await this.repository(scope).update({ themeId: Not(IsNull()) }, { themeId: null });
  }

  async assignTheme(ids: string[], themeId: string, scope: TransactionScope): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.repository(scope).update({ id: In(ids) }, { themeId });
  }

  private applyFilters(builder: SelectQueryBuilder<FeatureRequestEntity>, query: ListFeatureRequestsQuery): void {
    // Merged requests stay readable by id but leave the default list (spec, merge semantics).
    if (query.status === undefined) {
      builder.where(`${LIST_ALIAS}.status != :merged`, { merged: MERGED_STATUS });
    } else {
      builder.where(`${LIST_ALIAS}.status = :status`, { status: query.status });
    }
    if (query.themeId !== undefined) {
      builder.andWhere(`${LIST_ALIAS}.themeId = :themeId`, { themeId: query.themeId });
    }
    if (query.q !== undefined && query.q.length > 0) {
      builder.andWhere(
        `(LOWER(${LIST_ALIAS}.title) LIKE :pattern ESCAPE '\\' OR LOWER(${LIST_ALIAS}.description) LIKE :pattern ESCAPE '\\')`,
        { pattern: toContainsPattern(query.q) },
      );
    }
  }

  private applySort(builder: SelectQueryBuilder<FeatureRequestEntity>, sort: ListFeatureRequestsQuery['sort']): void {
    if (sort === 'votes') {
      builder.orderBy(`${LIST_ALIAS}.voteCount`, 'DESC');
    } else if (sort === 'priority') {
      // Portable "nulls last": SQLite and Postgres disagree on the default null ordering.
      builder
        .orderBy(`CASE WHEN ${ANALYSIS_ALIAS}.priorityScore IS NULL THEN 1 ELSE 0 END`, 'ASC')
        .addOrderBy(`${ANALYSIS_ALIAS}.priorityScore`, 'DESC');
    }
    builder.addOrderBy(`${LIST_ALIAS}.createdAt`, 'DESC').addOrderBy(`${LIST_ALIAS}.id`, 'ASC');
  }
}
