import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Provider } from '@fis/shared';
import { COLUMN_SIZES, ENUM_LENGTH, ISO_TIMESTAMP_LENGTH, UUID_LENGTH } from './column-sizes';

@Entity({ name: 'themes' })
export class ThemeEntity {
  @PrimaryColumn({ type: 'varchar', length: UUID_LENGTH })
  id!: string;

  @Index('idx_themes_name')
  @Column({ type: 'varchar', length: COLUMN_SIZES.themeName })
  name!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'varchar', length: ENUM_LENGTH })
  provider!: Provider;

  @Column({ name: 'created_at', type: 'varchar', length: ISO_TIMESTAMP_LENGTH })
  createdAt!: string;
}
