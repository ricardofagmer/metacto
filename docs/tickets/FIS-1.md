# FIS-1: Shared contracts and workspace

| Field | Value |
|---|---|
| Status | done |
| Owner unit | contracts + docs (wave 1) |
| Scope | `packages/shared/**`, workspace root (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`) |
| Depends on | - |
| Implemented in | `packages/shared/src/{index,common,errors,feature-request,vote,analysis,theme,scoring,brief,api,intelligence-port}.ts`, `packages/shared/package.json`, `packages/shared/tsconfig.build.json`, `package.json`, `pnpm-workspace.yaml`, `.env.example`, `.gitignore` |

## Scope

Set up the monorepo workspace (`apps/api`, `apps/web`, `packages/shared`,
package name `@fis/shared`) and publish the frozen contracts every other ticket
codes against: request, vote, theme, analysis with score breakdown, brief,
stakeholder draft, the `IntelligenceService` port with its input/output schemas,
enums for status, brief status, draft status and audience, the error envelope,
`SCORING_WEIGHTS`, and the API path constants (`API_ROUTES`).

Reconciliation notes: the package is `packages/shared`, not `packages/contracts`.
There is no `isFallback` field and no `source` enum; every AI output carries
`provider: 'anthropic' | 'heuristic'` instead (ADR 0009), and a request has only
`title`, `description`, `authorName`.

## Acceptance criteria

- [x] Workspace installs and typechecks from the root with one command (`pnpm install`, `pnpm -r typecheck`; root `dev` builds `@fis/shared` first).
- [x] `@fis/shared` exports every schema, type, enum and path constant from `src/index.ts`.
- [x] `.env.example` lists every environment variable (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`) with no values.
- [x] No application code in this ticket; contracts only (`zod` is the package's single dependency).

## Dependencies

None. Every other ticket depends on this one.
