import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { COLUMN_SIZES, ENUM_LENGTH, ISO_TIMESTAMP_LENGTH, UUID_LENGTH } from '../entities/column-sizes';

// Additive only (a new table), so it is backward-compatible with code that does not write the log yet.
// RESTRICT keeps the audit trail from being deleted along with the request it describes.
const featureRequestDecisionsTable = new Table({
  name: 'feature_request_decisions',
  columns: [
    { name: 'id', type: 'varchar', length: String(UUID_LENGTH), isPrimary: true, isNullable: false },
    { name: 'feature_request_id', type: 'varchar', length: String(UUID_LENGTH), isNullable: false },
    { name: 'kind', type: 'varchar', length: String(ENUM_LENGTH), isNullable: false },
    { name: 'decided_by', type: 'varchar', length: String(COLUMN_SIZES.actorName), isNullable: false },
    { name: 'note', type: 'text', isNullable: true },
    { name: 'created_at', type: 'varchar', length: String(ISO_TIMESTAMP_LENGTH), isNullable: false },
  ],
  foreignKeys: [
    { columnNames: ['feature_request_id'], referencedTableName: 'feature_requests', referencedColumnNames: ['id'], onDelete: 'RESTRICT' },
  ],
  checks: [{ name: 'chk_feature_request_decisions_kind', expression: `"kind" IN ('merge', 'status')` }],
  indices: [{ name: 'idx_feature_request_decisions_feature_request_id', columnNames: ['feature_request_id'] }],
});

export class FeatureRequestDecisions1759790000000 implements MigrationInterface {
  name = 'FeatureRequestDecisions1759790000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(featureRequestDecisionsTable, true, true, true);
  }

  // Dropping the table discards the audit history; run only to roll back a deploy that recorded nothing worth keeping.
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(featureRequestDecisionsTable, true, true, true);
  }
}
