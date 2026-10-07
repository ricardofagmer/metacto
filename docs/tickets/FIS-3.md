# FIS-3: Feature requests and votes API

| Field | Value |
|---|---|
| Status | done |
| Owner unit | backend incl. database (wave 2) |
| Scope | `apps/api/src/feature-requests/**`, `apps/api/src/votes/**`, `apps/api/src/config/**`, `apps/api/src/common/**`, `apps/api/src/security/**`, `apps/api/src/ai-budget/**` |
| Depends on | FIS-1, FIS-2 |
| Implemented in | `apps/api/src/feature-requests/{feature-requests.controller,feature-requests.service,feature-requests.repository,feature-request-votes.controller,feature-request-votes.service,feature-request.mapper,feature-requests.constants,feature-request-decisions.repository,feature-request-decision.mapper}.ts`, `apps/api/src/votes/{votes.service,votes.repository}.ts`, `apps/api/src/config/{env.schema,env.service,config.module}.ts`, `apps/api/src/common/{zod-validation.pipe,http-exception.filter,correlation-id.middleware,request-logging.middleware,json-logger,domain-errors}.ts`, `apps/api/src/security/{security.module,rate-limit.guard,rate-limit.decorator,fixed-window-rate-limiter,json-content-type.middleware,body-parser-errors.middleware,security-headers.middleware}.ts`, `apps/api/src/ai-budget/{ai-budget.module,budgeted-intelligence,daily-call-budget,ai-budget.tokens}.ts`, `apps/api/src/main.ts` |

## Scope

NestJS modules for creating, reading, listing, searching and updating feature
requests, voting once per `voterKey` per request, status changes by a PM with
`decidedBy` recorded on the row, and the zod-validated environment config
module (`EnvService`).

Reconciliation notes: votes are keyed by an anonymous `voterKey` (ADR 0005), not
a voter name. Search is a case-insensitive `LIKE '%q%'` over title and
description, not full-text. Requests have no `source` field. After the security
review (`docs/security-review.md`) the backend gained `security/` (per-IP
fixed-window rate limit as a global guard, JSON content-type gate, fixed-message
body-parser rejections, security headers) and `ai-budget/` (daily Anthropic call
budget with heuristic fallback), configured by `THROTTLE_WINDOW_SECONDS`,
`THROTTLE_LIMIT`, `THROTTLE_STRICT_LIMIT` and `AI_DAILY_CALL_BUDGET` in
`env.schema.ts`. Status changes append a row to `feature_request_decisions` in
the same transaction.

## Acceptance criteria

- [x] Create, get, list (paginated, default 20, max 100, filter by `status` and `themeId`, `q` search, sort `recent|votes|priority` with unanalysed requests last) and `PATCH /:id/status` endpoints exist with zod request and response schemas from `@fis/shared`.
- [x] `POST /:id/votes` rejects a second vote from the same `voterKey` with `conflict`; `DELETE /:id/votes` removes it.
- [x] Status is only changed through the status endpoint (and `merged` only through the merge endpoint); no AI path writes it.
- [x] Config fails startup on an invalid variable; every variable has a default except `ANTHROPIC_API_KEY`, which is optional.
- [x] `ZodValidationPipe` with `.strict()` schemas rejects unknown keys; `GlobalExceptionFilter` returns `{ statusCode, code, message, correlationId }`; `dependency` errors return a generic 503 message.
- [x] `POST /feature-requests` carries `@StrictRateLimit()`; every endpoint is under the global per-IP limit; 429 responses carry `Retry-After`.

## Dependencies

FIS-1 contracts, FIS-2 entities.
