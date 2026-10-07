# ADR 0002 — SQLite via TypeORM by default, Postgres via DATABASE_URL

Date: 2026-10-06
Status: accepted (amended 2026-10-06, see "Amendments")

## Context

Reviewers must run the system with zero infrastructure. Production needs a
database that handles concurrent writers and, later, vector similarity search for
duplicate detection and clustering at scale.

## Decision

TypeORM with the `better-sqlite3` driver writing to `./data/fis.sqlite` when
`DATABASE_URL` is unset. When `DATABASE_URL` starts with `postgres://`, the same
entities run against Postgres. Entity column types are chosen from the subset both
drivers support (`text`, `integer`, `real`, `simple-json`); schema synchronisation is
enabled for SQLite in development only, and migrations are the path for Postgres.
Production path: Postgres with the `pgvector` extension, where the TF-IDF and
full-corpus prompt strategies of ADR 0003 are replaced by stored embeddings.

## Alternatives rejected

- Postgres only (docker-compose): one extra dependency for reviewers, and a
  reviewer without Docker cannot run the project at all.
- In-memory store: trivial to run, but loses data on restart and would force a
  second persistence implementation before production.
- Prisma instead of TypeORM: comparable; TypeORM is chosen because the backend
  rules in force (`DefaultTypeOrmRepository`, `@Transaction`) assume it.

## Consequences

- JSON columns are opaque to SQLite; sortable AI fields (priority score) are
  denormalised into indexed scalar columns.
- The eventual pgvector adoption is a new ADR; this one commits only to the driver
  switch being a configuration change.

## Amendments (2026-10-06, reconciled with the implementation)

- **Migrations run for both drivers; `synchronize` is off everywhere.** The
  decision text said schema synchronisation is enabled for SQLite in development.
  `buildDataSourceOptions` (`apps/api/src/database/data-source-options.ts`) sets
  `migrationsRun: true` and `synchronize: false` for both the `better-sqlite3` and
  the `postgres` branch, so migrations are the only schema path on either driver.
- **Two migrations exist.** `1759780000000-initial-schema.ts` and
  `1759790000000-feature-request-decisions.ts` (the append-only decision log added
  after the security review; see ADR 0009 amendments). Both are listed in
  `MIGRATIONS` in `data-source-options.ts`.
- **The driver prefix is `postgres://` or `postgresql://`**
  (`POSTGRES_URL_PATTERN`), slightly wider than the decision text.
