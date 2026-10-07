import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { DuplicateCandidate, PriorityScore, Provider } from '@fis/shared';
import { ENUM_LENGTH, ISO_TIMESTAMP_LENGTH, MODEL_LENGTH, PROMPT_VERSION_LENGTH, UUID_LENGTH } from './column-sizes';

@Entity({ name: 'analyses' })
export class AnalysisEntity {
  @PrimaryColumn({ name: 'feature_request_id', type: 'varchar', length: UUID_LENGTH })
  featureRequestId!: string;

  @Column({ name: 'underlying_need', type: 'text' })
  underlyingNeed!: string;

  @Column({ name: 'duplicate_candidates', type: 'simple-json' })
  duplicateCandidates!: DuplicateCandidate[];

  @Column({ type: 'simple-json' })
  priority!: PriorityScore;

  // JSON columns cannot be sorted in SQLite, so the aggregate is denormalised for sort=priority.
  @Index('idx_analyses_priority_score')
  @Column({ name: 'priority_score', type: 'real' })
  priorityScore!: number;

  @Column({ type: 'varchar', length: ENUM_LENGTH })
  provider!: Provider;

  @Column({ type: 'varchar', length: MODEL_LENGTH, nullable: true })
  model!: string | null;

  @Column({ name: 'prompt_version', type: 'varchar', length: PROMPT_VERSION_LENGTH })
  promptVersion!: string;

  @Column({ name: 'created_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  createdAt!: string;
}
