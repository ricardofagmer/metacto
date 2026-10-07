import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BriefStatus, Provider } from '@fis/shared';
import { COLUMN_SIZES, ENUM_LENGTH, ISO_TIMESTAMP_LENGTH, MODEL_LENGTH, PROMPT_VERSION_LENGTH, UUID_LENGTH } from './column-sizes';

@Entity({ name: 'decision_briefs' })
export class DecisionBriefEntity {
  @PrimaryColumn({ type: 'varchar', length: UUID_LENGTH })
  id!: string;

  @Column({ name: 'theme_id', type: 'varchar', length: UUID_LENGTH, nullable: true })
  themeId!: string | null;

  @Column({ name: 'feature_request_id', type: 'varchar', length: UUID_LENGTH, nullable: true })
  featureRequestId!: string | null;

  @Column({ type: 'text' })
  recommendation!: string;

  @Column({ type: 'simple-json' })
  evidence!: string[];

  @Column({ type: 'simple-json' })
  risks!: string[];

  @Column({ name: 'open_questions', type: 'simple-json' })
  openQuestions!: string[];

  @Column({ type: 'varchar', length: ENUM_LENGTH })
  provider!: Provider;

  @Column({ type: 'varchar', length: MODEL_LENGTH, nullable: true })
  model!: string | null;

  @Column({ name: 'prompt_version', type: 'varchar', length: PROMPT_VERSION_LENGTH })
  promptVersion!: string;

  @Index('idx_decision_briefs_status')
  @Column({ type: 'varchar', length: ENUM_LENGTH })
  status!: BriefStatus;

  @Column({ name: 'decided_by', type: 'varchar', length: COLUMN_SIZES.actorName, nullable: true })
  decidedBy!: string | null;

  @Column({ name: 'decided_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH, nullable: true })
  decidedAt!: string | null;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote!: string | null;

  @Column({ name: 'created_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  createdAt!: string;
}
