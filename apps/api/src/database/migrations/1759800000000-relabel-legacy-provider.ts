import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Anthropic adapter was replaced by Gemini, and the shared Provider enum no longer accepts
 * 'anthropic'. Every read path parses rows through that enum, so one legacy row would fail a
 * whole list endpoint. Rows keep their AI label (they are model output, never heuristic) and
 * keep their stored model id, which still names the model that actually produced them.
 *
 * Static SQL with no user input, so nothing needs binding. Data only: no DDL, no locks beyond
 * the row updates.
 */
const LEGACY_PROVIDER = 'anthropic';
const CURRENT_PROVIDER = 'gemini';
const LEGACY_MODEL_PREFIX = 'claude-';
const TABLES_WITH_MODEL = ['analyses', 'decision_briefs', 'stakeholder_drafts'];
const TABLES_WITHOUT_MODEL = ['themes'];

export class RelabelLegacyProvider1759800000000 implements MigrationInterface {
  name = 'RelabelLegacyProvider1759800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...TABLES_WITH_MODEL, ...TABLES_WITHOUT_MODEL]) {
      await queryRunner.query(`UPDATE ${table} SET provider = '${CURRENT_PROVIDER}' WHERE provider = '${LEGACY_PROVIDER}'`);
    }
  }

  // Reverts only rows whose stored model id proves Anthropic origin. themes has no model column,
  // so a relabelled theme cannot be told apart from a Gemini one and stays 'gemini'; regenerate
  // themes after rolling back if that matters.
  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES_WITH_MODEL) {
      await queryRunner.query(`UPDATE ${table} SET provider = '${LEGACY_PROVIDER}' WHERE provider = '${CURRENT_PROVIDER}' AND model LIKE '${LEGACY_MODEL_PREFIX}%'`);
    }
  }
}
