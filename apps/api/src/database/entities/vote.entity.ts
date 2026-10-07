import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { COLUMN_SIZES, ISO_TIMESTAMP_LENGTH, UUID_LENGTH } from './column-sizes';

@Entity({ name: 'votes' })
@Index('uq_votes_request_voter', ['featureRequestId', 'voterKey'], { unique: true })
export class VoteEntity {
  @PrimaryColumn({ type: 'varchar', length: UUID_LENGTH })
  id!: string;

  @Column({ name: 'feature_request_id', type: 'varchar', length: UUID_LENGTH })
  featureRequestId!: string;

  @Index('idx_votes_voter_key')
  @Column({ name: 'voter_key', type: 'varchar', length: COLUMN_SIZES.voterKey })
  voterKey!: string;

  @Column({ name: 'created_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  createdAt!: string;
}
