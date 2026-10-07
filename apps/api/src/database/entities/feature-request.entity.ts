import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { FeatureRequestStatus } from '@fis/shared';
import { COLUMN_SIZES, ENUM_LENGTH, ISO_TIMESTAMP_LENGTH, UUID_LENGTH } from './column-sizes';

@Entity({ name: 'feature_requests' })
export class FeatureRequestEntity {
  @PrimaryColumn({ type: 'varchar', length: UUID_LENGTH })
  id!: string;

  @Column({ type: 'varchar', length: COLUMN_SIZES.title })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'author_name', type: 'varchar', length: COLUMN_SIZES.authorName })
  authorName!: string;

  @Index('idx_feature_requests_status')
  @Column({ type: 'varchar', length: ENUM_LENGTH })
  status!: FeatureRequestStatus;

  @Column({ name: 'merged_into_id', type: 'varchar', length: UUID_LENGTH, nullable: true })
  mergedIntoId!: string | null;

  @Index('idx_feature_requests_theme_id')
  @Column({ name: 'theme_id', type: 'varchar', length: UUID_LENGTH, nullable: true })
  themeId!: string | null;

  @Index('idx_feature_requests_vote_count')
  @Column({ name: 'vote_count', type: 'integer', default: 0 })
  voteCount!: number;

  // ADR 0004: the latest human decision (status change or merge) is recorded as queryable columns.
  @Column({ name: 'decided_by', type: 'varchar', length: COLUMN_SIZES.actorName, nullable: true })
  decidedBy!: string | null;

  @Column({ name: 'decided_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH, nullable: true })
  decidedAt!: string | null;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote!: string | null;

  @Index('idx_feature_requests_created_at')
  @Column({ name: 'created_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  updatedAt!: string;
}
