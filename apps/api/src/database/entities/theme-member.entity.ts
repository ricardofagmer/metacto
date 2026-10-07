import { Entity, Index, PrimaryColumn } from 'typeorm';
import { UUID_LENGTH } from './column-sizes';

@Entity({ name: 'theme_members' })
export class ThemeMemberEntity {
  @PrimaryColumn({ name: 'theme_id', type: 'varchar', length: UUID_LENGTH })
  themeId!: string;

  // A request belongs to at most one theme.
  @Index('uq_theme_members_feature_request_id', { unique: true })
  @PrimaryColumn({ name: 'feature_request_id', type: 'varchar', length: UUID_LENGTH })
  featureRequestId!: string;
}
