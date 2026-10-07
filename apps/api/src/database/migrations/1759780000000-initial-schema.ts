import { MigrationInterface, QueryRunner, Table, TableColumnOptions } from 'typeorm';
import {
  COLUMN_SIZES,
  ENUM_LENGTH,
  ISO_TIMESTAMP_LENGTH,
  MODEL_LENGTH,
  PROMPT_VERSION_LENGTH,
  UUID_LENGTH,
} from '../entities/column-sizes';

// Built with the Table API rather than raw SQL so the same migration runs on SQLite and Postgres (ADR 0002).
function varchar(name: string, length: number, nullable = false): TableColumnOptions {
  return { name, type: 'varchar', length: String(length), isNullable: nullable };
}

function idColumn(name = 'id'): TableColumnOptions {
  return { ...varchar(name, UUID_LENGTH), isPrimary: true };
}

function timestamp(name: string, nullable = false): TableColumnOptions {
  return varchar(name, ISO_TIMESTAMP_LENGTH, nullable);
}

function text(name: string, nullable = false): TableColumnOptions {
  return { name, type: 'text', isNullable: nullable };
}

const CASCADE = 'CASCADE';
const SET_NULL = 'SET NULL';
const RESTRICT = 'RESTRICT';

const themesTable = new Table({
  name: 'themes',
  columns: [
    idColumn(),
    varchar('name', COLUMN_SIZES.themeName),
    text('summary'),
    varchar('provider', ENUM_LENGTH),
    timestamp('created_at'),
  ],
  indices: [{ name: 'idx_themes_name', columnNames: ['name'] }],
});

const featureRequestsTable = new Table({
  name: 'feature_requests',
  columns: [
    idColumn(),
    varchar('title', COLUMN_SIZES.title),
    text('description'),
    varchar('author_name', COLUMN_SIZES.authorName),
    varchar('status', ENUM_LENGTH),
    varchar('merged_into_id', UUID_LENGTH, true),
    varchar('theme_id', UUID_LENGTH, true),
    { name: 'vote_count', type: 'integer', default: 0, isNullable: false },
    varchar('decided_by', COLUMN_SIZES.actorName, true),
    timestamp('decided_at', true),
    text('decision_note', true),
    timestamp('created_at'),
    timestamp('updated_at'),
  ],
  foreignKeys: [
    { columnNames: ['merged_into_id'], referencedTableName: 'feature_requests', referencedColumnNames: ['id'], onDelete: SET_NULL },
    { columnNames: ['theme_id'], referencedTableName: 'themes', referencedColumnNames: ['id'], onDelete: SET_NULL },
  ],
  indices: [
    { name: 'idx_feature_requests_status', columnNames: ['status'] },
    { name: 'idx_feature_requests_theme_id', columnNames: ['theme_id'] },
    { name: 'idx_feature_requests_vote_count', columnNames: ['vote_count'] },
    { name: 'idx_feature_requests_created_at', columnNames: ['created_at'] },
  ],
});

const votesTable = new Table({
  name: 'votes',
  columns: [idColumn(), varchar('feature_request_id', UUID_LENGTH), varchar('voter_key', COLUMN_SIZES.voterKey), timestamp('created_at')],
  foreignKeys: [
    { columnNames: ['feature_request_id'], referencedTableName: 'feature_requests', referencedColumnNames: ['id'], onDelete: CASCADE },
  ],
  indices: [
    { name: 'uq_votes_request_voter', columnNames: ['feature_request_id', 'voter_key'], isUnique: true },
    { name: 'idx_votes_voter_key', columnNames: ['voter_key'] },
  ],
});

const analysesTable = new Table({
  name: 'analyses',
  columns: [
    idColumn('feature_request_id'),
    text('underlying_need'),
    text('duplicate_candidates'),
    text('priority'),
    { name: 'priority_score', type: 'real', isNullable: false },
    varchar('provider', ENUM_LENGTH),
    varchar('model', MODEL_LENGTH, true),
    varchar('prompt_version', PROMPT_VERSION_LENGTH),
    timestamp('created_at'),
  ],
  foreignKeys: [
    { columnNames: ['feature_request_id'], referencedTableName: 'feature_requests', referencedColumnNames: ['id'], onDelete: CASCADE },
  ],
  indices: [{ name: 'idx_analyses_priority_score', columnNames: ['priority_score'] }],
});

const themeMembersTable = new Table({
  name: 'theme_members',
  columns: [
    { ...varchar('theme_id', UUID_LENGTH), isPrimary: true },
    { ...varchar('feature_request_id', UUID_LENGTH), isPrimary: true },
  ],
  foreignKeys: [
    { columnNames: ['theme_id'], referencedTableName: 'themes', referencedColumnNames: ['id'], onDelete: CASCADE },
    { columnNames: ['feature_request_id'], referencedTableName: 'feature_requests', referencedColumnNames: ['id'], onDelete: CASCADE },
  ],
  indices: [{ name: 'uq_theme_members_feature_request_id', columnNames: ['feature_request_id'], isUnique: true }],
});

const decisionBriefsTable = new Table({
  name: 'decision_briefs',
  columns: [
    idColumn(),
    varchar('theme_id', UUID_LENGTH, true),
    varchar('feature_request_id', UUID_LENGTH, true),
    text('recommendation'),
    text('evidence'),
    text('risks'),
    text('open_questions'),
    varchar('provider', ENUM_LENGTH),
    varchar('model', MODEL_LENGTH, true),
    varchar('prompt_version', PROMPT_VERSION_LENGTH),
    varchar('status', ENUM_LENGTH),
    varchar('decided_by', COLUMN_SIZES.actorName, true),
    timestamp('decided_at', true),
    text('decision_note', true),
    timestamp('created_at'),
  ],
  // RESTRICT on theme_id is the database half of "a theme referenced by a brief is never deleted".
  foreignKeys: [
    { columnNames: ['theme_id'], referencedTableName: 'themes', referencedColumnNames: ['id'], onDelete: RESTRICT },
    { columnNames: ['feature_request_id'], referencedTableName: 'feature_requests', referencedColumnNames: ['id'], onDelete: RESTRICT },
  ],
  checks: [{ name: 'chk_decision_briefs_one_subject', expression: '("theme_id" IS NULL) <> ("feature_request_id" IS NULL)' }],
  indices: [{ name: 'idx_decision_briefs_status', columnNames: ['status'] }],
});

const stakeholderDraftsTable = new Table({
  name: 'stakeholder_drafts',
  columns: [
    idColumn(),
    varchar('brief_id', UUID_LENGTH),
    varchar('audience', ENUM_LENGTH),
    text('body'),
    varchar('provider', ENUM_LENGTH),
    varchar('model', MODEL_LENGTH, true),
    varchar('prompt_version', PROMPT_VERSION_LENGTH),
    varchar('status', ENUM_LENGTH),
    varchar('updated_by', COLUMN_SIZES.actorName, true),
    timestamp('updated_at'),
    timestamp('created_at'),
  ],
  foreignKeys: [
    { columnNames: ['brief_id'], referencedTableName: 'decision_briefs', referencedColumnNames: ['id'], onDelete: CASCADE },
  ],
  indices: [{ name: 'idx_stakeholder_drafts_brief_id', columnNames: ['brief_id'] }],
});

// Creation order follows foreign-key dependencies; teardown runs in reverse.
const TABLES_IN_CREATION_ORDER = [
  themesTable,
  featureRequestsTable,
  votesTable,
  analysesTable,
  themeMembersTable,
  decisionBriefsTable,
  stakeholderDraftsTable,
];

export class InitialSchema1759780000000 implements MigrationInterface {
  name = 'InitialSchema1759780000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES_IN_CREATION_ORDER) {
      await queryRunner.createTable(table, true, true, true);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...TABLES_IN_CREATION_ORDER].reverse()) {
      await queryRunner.dropTable(table, true, true, true);
    }
  }
}
