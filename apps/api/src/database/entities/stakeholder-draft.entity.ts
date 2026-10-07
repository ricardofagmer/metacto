import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Audience, DraftStatus, Provider } from '@fis/shared';
import { COLUMN_SIZES, ENUM_LENGTH, ISO_TIMESTAMP_LENGTH, MODEL_LENGTH, PROMPT_VERSION_LENGTH, UUID_LENGTH } from './column-sizes';

@Entity({ name: 'stakeholder_drafts' })
export class StakeholderDraftEntity {
  @PrimaryColumn({ type: 'varchar', length: UUID_LENGTH })
  id!: string;

  @Index('idx_stakeholder_drafts_brief_id')
  @Column({ name: 'brief_id', type: 'varchar', length: UUID_LENGTH })
  briefId!: string;

  @Column({ type: 'varchar', length: ENUM_LENGTH })
  audience!: Audience;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'varchar', length: ENUM_LENGTH })
  provider!: Provider;

  @Column({ type: 'varchar', length: MODEL_LENGTH, nullable: true })
  model!: string | null;

  @Column({ name: 'prompt_version', type: 'varchar', length: PROMPT_VERSION_LENGTH })
  promptVersion!: string;

  @Column({ type: 'varchar', length: ENUM_LENGTH })
  status!: DraftStatus;

  @Column({ name: 'updated_by', type: 'varchar', length: COLUMN_SIZES.actorName, nullable: true })
  updatedBy!: string | null;

  @Column({ name: 'updated_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  updatedAt!: string;

  @Column({ name: 'created_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  createdAt!: string;
}
