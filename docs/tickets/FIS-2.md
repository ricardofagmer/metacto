# FIS-2: Database entities, migrations and seed

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | backend incl. database (wave 2) |
| Scope | `apps/api/src/database/**` |
| Depends on | FIS-1 |
| Implemented in | `apps/api/src/database/entities/*.entity.ts`, `apps/api/src/database/migrations/{1759780000000-initial-schema,1759790000000-feature-request-decisions}.ts`, `apps/api/src/database/data-source-options.ts`, `apps/api/src/database/seed/{seed,seed-data}.ts`, `apps/api/src/database/{default-typeorm.repository,unit-of-work,query-errors}.ts` |

## Scope

TypeORM schema for feature requests (including `decided_by`, `decided_at`,
`decision_note`), votes, analyses (duplicate candidates and priority as JSON plus
a denormalised `priority_score`), themes, theme membership, decision briefs and
stakeholder drafts. SQLite (better-sqlite3) by default, Postgres when
`DATABASE_URL` is set; migrations run at boot for both drivers
(`migrationsRun: true`, `synchronize: false`). A second migration, added after
the security review, creates the append-only `feature_request_decisions` table
(`kind` in `merge`/`status`, FK `ON DELETE RESTRICT`; ADR 0009 amendments).
Idempotent seed (`pnpm --filter @fis/api seed`) with 18 requests across five
themes, fixed ids.

Reconciliation notes: the ticket originally asked for an AI call log table, a
scoring weight configuration table, a separate duplicate-candidates table and a
PostgreSQL full-text index. None exist: the call log is a structured stdout log
line, weights are the `SCORING_WEIGHTS` constant (ADR 0007), candidates live
inside `analyses.duplicate_candidates`, and search is `LIKE` over title and
description (FIS-3).

## Acceptance criteria

- [x] Migrations run from empty; each of the two migrations has a `down()` that drops what its `up()` created (the second one's `down()` discards the decision history).
- [x] Every table a ticket reads or writes exists with indexes on the filter and ordering columns (`status`, `theme_id`, `vote_count`, `created_at`, `priority_score`, brief `status`, draft `brief_id`).
- [ ] Full-text search index on request title and description. Not implemented; search is `LIKE`-based.
- [x] Seed is idempotent (fixed ids, skips existing rows) and is a separate script, not a migration.
- [x] No business logic; entities, migration, data-source options and seed only.

## Dependencies

FIS-1 for contract enums and column sizes.
