import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { COLUMN_SIZES, ENUM_LENGTH, ISO_TIMESTAMP_LENGTH, UUID_LENGTH } from './column-sizes';

// Enforced by chk_feature_request_decisions_kind; a new kind needs a migration that widens that check.
export type FeatureRequestDecisionKind = 'merge' | 'status';

// Append-only audit of human decisions; rows are inserted in the same transaction as the decision and never updated.
@Entity({ name: 'feature_request_decisions' })
export class FeatureRequestDecisionEntity {
  @PrimaryColumn({ type: 'varchar', length: UUID_LENGTH })
  id!: string;

  @Index('idx_feature_request_decisions_feature_request_id')
  @Column({ name: 'feature_request_id', type: 'varchar', length: UUID_LENGTH })
  featureRequestId!: string;

  @Column({ type: 'varchar', length: ENUM_LENGTH })
  kind!: FeatureRequestDecisionKind;

  @Column({ name: 'decided_by', type: 'varchar', length: COLUMN_SIZES.actorName })
  decidedBy!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'created_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  createdAt!: string;
}
