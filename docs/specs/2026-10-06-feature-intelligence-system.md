# Feature Intelligence System — Specification

Date: 2026-10-06
Status: implemented (reconciled with the code on 2026-10-06; see "Implementation notes")
Risk: medium — new product, no production data, public API contract being frozen
Related ADRs: `docs/adr/0001` … `docs/adr/0009`

## Problem Statement

Product teams receive feature requests as unstructured text from many channels. Today
triage is manual: a PM reads each request, guesses whether it duplicates an existing
one, infers the underlying need, and periodically assembles a prioritisation deck and
a stakeholder update by hand. The costs are concrete:

- Duplicate requests fragment votes, so demand signal is understated and the same
  idea is triaged several times.
- Prioritisation is inconsistent because the criteria live in people's heads, not in
  a stated weighting with a written rationale.
- Decisions are slow to reach requesters, leadership and engineering because every
  audience needs a differently worded update.

The Feature Intelligence System turns submitted requests into product decisions with
AI assistance at every step, while keeping every decision (merge, status change,
brief approval, sending a draft) a recorded human action. Without it the team keeps
paying triage time per request, carries an unknown duplicate rate, and has no
measurable time-to-stakeholder-update.

## Solution

A pnpm monorepo with three packages: `apps/api` (NestJS, REST under `/api/v1`),
`apps/web` (Next.js App Router) and `packages/shared` (`@fis/shared`: zod schemas,
inferred types, the `IntelligenceService` port, the scoring weights constant). The
API persists to SQLite via TypeORM + better-sqlite3 by default and to Postgres when
`DATABASE_URL` is set. All AI work goes through one port, `IntelligenceService`,
with two adapters: `AnthropicProvider` (tool-use structured output, zod-validated)
and `HeuristicProvider` (TF-IDF cosine similarity and rule-based templates), chosen
at boot by the presence of `ANTHROPIC_API_KEY`. Every AI artefact carries
`provider: 'anthropic' | 'heuristic'` and the web app renders that label; the
heuristic path is never presented as LLM output. The AI only produces recommendations
and drafts; state transitions are separate endpoints that require `decidedBy`.

## Architecture

```
apps/web (Next.js)  --HTTP JSON-->  apps/api (NestJS)  --TypeORM-->  SQLite | Postgres
       |                                   |
       +------ @fis/shared (zod, types) ---+---- IntelligenceService port
                                                 |-- AnthropicProvider (Anthropic Messages API, tool-use)
                                                 +-- HeuristicProvider (in-process, no network)
```

### API modules (`apps/api/src/<module>/`)

| Module | Owns | Public surface |
|---|---|---|
| `config` | zod env schema, `EnvService` | `EnvService` |
| `database` | TypeORM data source, entities registration, driver selection by `DATABASE_URL` | `DatabaseModule` |
| `feature-requests` | `feature_requests` table, list/search/sort, merge, status change | `FeatureRequestsService` |
| `votes` | `votes` table, vote add/remove, `voteCount` maintenance | `VotesService` |
| `intelligence` | provider selection (`intelligence.module.ts`), both providers under `providers/anthropic/` and `providers/heuristic/`, prompt loader and versions under `prompts/`, `IntelligenceInfoService` for `/health` | `INTELLIGENCE_SERVICE`, `HEURISTIC_INTELLIGENCE_SERVICE` tokens |
| `analyses` | `analyses` table, priority provenance for the list endpoint | `AnalysesRepository` |
| `themes` | `themes`, `theme_members`, `POST /intelligence/cluster`, `GET /themes` | `ThemesService` |
| `briefs` | `decision_briefs`, `stakeholder_drafts`, decision recording, `GET /briefs`, `GET /briefs/:id/drafts` | `BriefsService`, `StakeholderDraftsService` |
| `health` | `GET /health` | `HealthService` |

Prompt markdown files live outside `src`, in `apps/api/prompts/`; the golden set and
eval runner in `apps/api/evals/`.

Dependency direction: `briefs -> intelligence -> feature-requests`; `votes ->
feature-requests`; nothing imports `briefs`. Controllers call services only.
Providers are selected in `intelligence.module.ts` via a factory on `EnvService`.

### Database tables

All ids are UUID v4 strings. Timestamps are ISO-8601 strings in UTC (`TEXT` in
SQLite, `timestamptz` in Postgres). JSON columns are `TEXT` in SQLite, `jsonb` in
Postgres; TypeORM `simple-json` is acceptable for the SQLite default.

| Table | Columns | Indexes / constraints |
|---|---|---|
| `feature_requests` | `id` PK, `title` (120), `description` (4000), `author_name` (80), `status` enum, `merged_into_id` nullable FK -> `feature_requests.id`, `theme_id` nullable FK -> `themes.id`, `vote_count` int default 0, `decided_by` nullable, `decided_at` nullable, `decision_note` nullable (ADR 0009; written by the status and merge endpoints, not exposed on `FeatureRequest`), `created_at`, `updated_at` | idx `(status)`, idx `(theme_id)`, idx `(vote_count desc)`, idx `(created_at desc)` |
| `votes` | `id` PK, `feature_request_id` FK, `voter_key` (64), `created_at` | unique `(feature_request_id, voter_key)`, idx `(voter_key)` |
| `analyses` | `feature_request_id` PK/FK, `underlying_need` text, `duplicate_candidates` json, `priority` json, `priority_score` real (denormalised copy of `priority.score` for the SQL sort), `provider` enum, `model` nullable, `prompt_version` text, `created_at` | one row per request; re-analysis replaces it |
| `themes` | `id` PK, `name` (80), `summary` text, `provider` enum, `created_at` | idx `(name)` |
| `theme_members` | `theme_id` FK, `feature_request_id` FK | PK `(theme_id, feature_request_id)`; a request belongs to at most one theme (unique `feature_request_id`) |
| `decision_briefs` | `id` PK, `theme_id` nullable FK, `feature_request_id` nullable FK, `recommendation` text, `evidence` json, `risks` json, `open_questions` json, `provider` enum, `model` nullable, `prompt_version`, `status` enum, `decided_by` nullable, `decided_at` nullable, `decision_note` nullable, `created_at` | check: exactly one of `theme_id`, `feature_request_id` is non-null; idx `(status)` |
| `stakeholder_drafts` | `id` PK, `brief_id` FK, `audience` enum, `body` text, `provider` enum, `model` nullable, `prompt_version`, `status` enum, `updated_by` nullable, `updated_at`, `created_at` | idx `(brief_id)` |

`theme_id` on `feature_requests` is a denormalised copy of `theme_members` for
list filtering; the clustering write updates both inside one transaction.

Column names are snake_case at the database level only (TypeORM `name:` option);
TypeScript identifiers remain camelCase.

## Frozen contracts (`packages/shared/src`)

Package name `@fis/shared`, depends on `zod` only, compiles standalone with its own
`tsconfig.json` (strict, extends `../../tsconfig.base.json`). Everything below is
exported from `src/index.ts`. Each schema is a zod schema with its type inferred via
`z.infer`; nothing is a hand-written interface except the port.

Suggested file layout (the implementing agent may merge files but not rename
exports):

```
packages/shared/src/
  index.ts
  common.ts            ids, timestamps, Provider, ErrorEnvelope, pagination
  feature-request.ts   FeatureRequest, FeatureRequestStatus
  vote.ts              Vote
  analysis.ts          Analysis, DuplicateCandidate, PriorityScore, PriorityBreakdown
  theme.ts             Theme
  brief.ts             DecisionBrief, StakeholderDraft, Audience
  scoring.ts           SCORING_WEIGHTS
  api.ts               request/response schemas per endpoint
  intelligence-port.ts IntelligenceService interface + its input/output types
```

### Common

- `Id = z.string().uuid()`
- `IsoDateTime = z.string().datetime()`
- `Provider = z.enum(['anthropic', 'heuristic'])`
- `ErrorEnvelope = { statusCode: number (int), code: ErrorCode, message: string, correlationId: string }`
- `ErrorCode = z.enum(['validation', 'auth', 'not_found', 'conflict', 'rate_limited', 'dependency', 'internal'])`
- `PaginationQuery = { page: int 1..10000 default 1, limit: int 1..100 default 20 }` (coerced from strings; the `page` cap, `MAX_PAGE`, was added after the security review so a huge `OFFSET` never reaches the database)
- `paginated(item) => { items: item[], total: int >= 0, page: int, limit: int }` — a generic helper returning a zod object schema

### FeatureRequest

```
FeatureRequestStatus = z.enum(['open', 'under_review', 'planned', 'declined', 'merged'])
FeatureRequest = {
  id: Id,
  title: string, trimmed, 3..120,
  description: string, trimmed, 10..4000,
  authorName: string, trimmed, 1..80,
  status: FeatureRequestStatus,
  mergedIntoId: Id optional,
  themeId: Id optional,
  voteCount: int >= 0,
  createdAt: IsoDateTime,
}
```
Invariant (refine): `status === 'merged'` iff `mergedIntoId` is present.

### Vote

```
Vote = { id: Id, featureRequestId: Id, voterKey: string 8..64, createdAt: IsoDateTime }
```
Uniqueness `(featureRequestId, voterKey)` is a database constraint, documented on the
schema with a comment; zod cannot express it.

### Analysis

```
DuplicateCandidate = { id: Id, similarity: number 0..1, rationale: string 1..500 }
PriorityBreakdown  = { reach, impact, strategicFit, effortInverse, demand: number 0..100 each }
PriorityScore      = { score: number 0..100, breakdown: PriorityBreakdown, rationale: string 1..2000 }
Analysis = {
  featureRequestId: Id,
  underlyingNeed: string 1..1000,
  duplicateCandidates: DuplicateCandidate[] max 10,
  priority: PriorityScore,
  provider: Provider,
  model: string optional,          // present iff provider === 'anthropic'
  promptVersion: string,           // e.g. 'analyze@1'
  createdAt: IsoDateTime,
}
```

### Theme

```
Theme = { id: Id, name: string 1..80, summary: string 1..1000, requestIds: Id[] min 1, provider: Provider }
```

### DecisionBrief and StakeholderDraft

```
BriefStatus = z.enum(['draft', 'approved', 'rejected'])
BriefSubject = z.union([{ themeId: Id }, { featureRequestId: Id }])   // exactly one
DecisionBrief = {
  id: Id,
  themeId: Id optional, featureRequestId: Id optional,  // refine: exactly one present
  recommendation: string 1..2000,
  evidence: string[] max 20,
  risks: string[] max 20,
  openQuestions: string[] max 20,
  provider: Provider,
  model: string optional,
  promptVersion: string,
  status: BriefStatus,
  decidedBy: string 1..80 optional,
  decidedAt: IsoDateTime optional,
  decisionNote: string max 1000 optional,
  createdAt: IsoDateTime,
}
Audience = z.enum(['requesters', 'leadership', 'engineering'])
DraftStatus = z.enum(['draft', 'approved'])
StakeholderDraft = {
  id: Id, briefId: Id, audience: Audience,
  body: string 1..5000, provider: Provider, model: string optional, promptVersion: string,
  status: DraftStatus, updatedBy: string 1..80 optional, updatedAt: IsoDateTime, createdAt: IsoDateTime,
}
```
Invariant: `status !== 'draft'` on a brief implies `decidedBy` and `decidedAt` present.

### Scoring weights

```
SCORING_WEIGHTS = { reach: 0.25, impact: 0.25, strategicFit: 0.2, effortInverse: 0.15, demand: 0.15 } as const
```
Sum is exactly 1.0; `score = sum(breakdown[k] * SCORING_WEIGHTS[k])`, rounded to one
decimal. The constant is the single home of the criteria (ADR 0007). A unit assertion
that the weights sum to 1 is recommended but tests are out of scope for this spec.

### API request/response schemas (`api.ts`)

All routes are prefixed `/api/v1`. Every endpoint has one request schema (params,
query and/or body) and one response schema; the API validates requests with zod
pipes built from these schemas and the web app parses responses with them.

| Method, path | Request | Response | Error codes |
|---|---|---|---|
| `POST /feature-requests` | body `{ title, description, authorName }` (from `FeatureRequest`) | `201 { request: FeatureRequest, duplicateCandidates: DuplicateCandidate[], provider: Provider }` (`provider` names the adapter that produced the candidates, ADR 0009) | `validation` (AI provider failure degrades to heuristic; if both fail, `duplicateCandidates` is empty; the submit never fails because of AI) |
| `GET /feature-requests` | query `{ q?: string max 200, status?: FeatureRequestStatus, themeId?: Id, sort: 'votes'\|'priority'\|'recent' default 'recent', page, limit }` | `200 paginated(FeatureRequestListItem)` where `FeatureRequestListItem = FeatureRequest & { priorityScore?: number, priorityProvider?: Provider, priorityModel?: string }` (the three are present together when an analysis exists) | `validation` |
| `GET /feature-requests/:id` | params `{ id }` | `200 { request: FeatureRequest, analysis: Analysis \| null, votes: int, mergedRequests: Id[] }` | `not_found` |
| `POST /feature-requests/:id/votes` | params `{ id }`, body `{ voterKey }` | `201 { voteCount }` | `not_found`, `conflict` (already voted) |
| `DELETE /feature-requests/:id/votes` | params `{ id }`, body `{ voterKey }` | `200 { voteCount }` | `not_found` (no such vote) |
| `POST /feature-requests/:id/merge` | params `{ id }`, body `{ targetId: Id, decidedBy: string 1..80, note?: string max 1000 }` | `200 { source: FeatureRequest, target: FeatureRequest }` | `not_found`, `conflict` (self-merge, target merged, source already merged), `validation` |
| `PATCH /feature-requests/:id/status` | params `{ id }`, body `{ status: exclude 'merged', decidedBy, note?: string max 1000 }` | `200 FeatureRequest` | `not_found`, `conflict` (request is merged; use merge endpoint) |
| `POST /intelligence/analyze/:id` | params `{ id }` | `200 Analysis` | `not_found`, `dependency` |
| `POST /intelligence/cluster` | body `{}` (empty object) | `200 { themes: Theme[], provider: Provider }` | `dependency`, `conflict` (fewer than 2 open requests) |
| `GET /themes` | none | `200 { items: Theme[] }` | — |
| `POST /intelligence/briefs` | body `BriefSubject` | `201 DecisionBrief` | `not_found`, `validation`, `dependency` |
| `GET /briefs` | query `{ themeId?: Id, featureRequestId?: Id, status?: BriefStatus }` (`ListBriefsQuery`, unknown keys rejected) | `200 { items: DecisionBrief[] }` | `validation` |
| `PATCH /briefs/:id/decision` | params `{ id }`, body `{ status: 'approved'\|'rejected', decidedBy, decisionNote?: string max 1000 }` | `200 DecisionBrief` | `not_found`, `conflict` (already decided) |
| `POST /briefs/:id/drafts` | params `{ id }`, body `{ audience: Audience }` | `201 StakeholderDraft` | `not_found`, `conflict` (brief not approved), `dependency` |
| `GET /briefs/:id/drafts` | params `{ id }` | `200 { items: StakeholderDraft[] }` (`ListStakeholderDraftsResponse`) | `not_found` |
| `PATCH /drafts/:id` | params `{ id }`, body `{ body?: string 1..5000, status?: DraftStatus, updatedBy: string 1..80 }` (at least one of body/status) | `200 StakeholderDraft` | `not_found`, `validation` |
| `GET /health` | none | `200 { status: 'ok', database: 'up'\|'down', provider: Provider, version: string }` | — |

Merge semantics: source gets `status='merged'`, `mergedIntoId=targetId`; source votes
whose `voterKey` is absent on the target are re-pointed to the target, duplicates
discarded; target `voteCount` recomputed; all in one transaction. A merged request
stays readable by id and is excluded from the default list unless `status=merged`.

Search (`q`) is a case-insensitive `LIKE '%q%'` over `title` and `description`
(`FeatureRequestsRepository`); there is no full-text index. The two read endpoints
`GET /briefs` and `GET /briefs/:id/drafts` were added after the contract freeze so the
web app can show stored briefs and drafts on reload; they are additive.

### IntelligenceService port (`intelligence-port.ts`)

A TypeScript interface, not a zod schema. Input and output types are zod schemas
defined in the same file so providers can validate model output against them.

```
AnalyzeInput          = { request: Pick<FeatureRequest,'id'|'title'|'description'>, corpus: RequestSummary[] }
RequestSummary        = { id: Id, title: string, description: string, voteCount: int, status: FeatureRequestStatus }
AnalyzeOutput         = Omit<Analysis, 'createdAt'>
FindDuplicatesInput   = { request: Pick<FeatureRequest,'id'|'title'|'description'>, corpus: RequestSummary[], threshold: number 0..1 default 0.6, limit: int 1..10 default 5 }
FindDuplicatesOutput  = { candidates: DuplicateCandidate[], provider: Provider, model?: string, promptVersion: string }
ClusterInput          = { requests: RequestSummary[] (min 2), maxThemes: int 1..20 default 8 }
ClusterOutput         = { themes: Array<Omit<Theme,'id'>>, provider, model?, promptVersion }   // every request id appears in at most one theme
ScorePriorityInput    = { request: RequestSummary, underlyingNeed: string, weights: typeof SCORING_WEIGHTS, corpusSize: int, maxVoteCount: int }
ScorePriorityOutput   = { priority: PriorityScore, provider, model?, promptVersion }
DraftBriefInput       = { subject: BriefSubject, requests: RequestSummary[] min 1, analyses: Analysis[], theme?: Theme }
DraftBriefOutput      = Pick<DecisionBrief,'recommendation'|'evidence'|'risks'|'openQuestions'|'provider'|'model'|'promptVersion'>
DraftStakeholderInput = { brief: DecisionBrief, audience: Audience, requests: RequestSummary[] }
DraftStakeholderOutput= { body: string, provider, model?, promptVersion }

interface IntelligenceService {
  readonly provider: Provider;
  analyze(input: AnalyzeInput): Promise<AnalyzeOutput>;
  findDuplicates(input: FindDuplicatesInput): Promise<FindDuplicatesOutput>;
  cluster(input: ClusterInput): Promise<ClusterOutput>;
  scorePriority(input: ScorePriorityInput): Promise<ScorePriorityOutput>;
  draftBrief(input: DraftBriefInput): Promise<DraftBriefOutput>;
  draftStakeholderMessage(input: DraftStakeholderInput): Promise<DraftStakeholderOutput>;
}
```

Port rules: methods are pure with respect to persistence (they never write to the
database); the `provider` field in every output must equal `this.provider`; a method
that cannot produce a schema-valid result throws `IntelligenceUnavailableError`
(error code `dependency`), which the calling service maps to the heuristic fallback
for submit-time dedupe and to an HTTP 503 elsewhere.

## Sequences

### Submit -> dedupe -> analyze

1. `POST /feature-requests` validates the body, inserts the request (`status=open`,
   `voteCount=0`) in a transaction.
2. `FeatureRequestsService` loads the corpus (all non-merged requests, id + title +
   description + voteCount + status, bounded to the 500 most recent) and calls
   `intelligence.findDuplicates`. Anthropic failure (timeout, invalid output after one
   retry) falls back to `HeuristicProvider.findDuplicates`; the response's candidates
   then carry `provider:'heuristic'`. The submit never fails because of AI.
3. Response returns the request plus candidates. No analysis row is written here.
4. The web app shows candidates with similarity, rationale and provider label and
   offers "Merge into" (PM toggle on) which calls the merge endpoint with `decidedBy`.
5. `POST /intelligence/analyze/:id` (triggered by the web after submit, or manually)
   calls `intelligence.analyze`, which produces underlying need, duplicate candidates
   and priority in one call (Anthropic) or three heuristic steps, and upserts
   `analyses`. The list sort `priority` reads `analyses.priority.score`.

### Clustering

`POST /intelligence/cluster` loads all non-merged requests, calls
`intelligence.cluster`, then in one transaction deletes existing `themes` and
`theme_members`, inserts the new ones, and updates `feature_requests.theme_id`.
Clustering is a full recompute; previous themes are not preserved (Open Question 2).

### Brief flow

1. `POST /intelligence/briefs` with a theme or request subject loads the subject's
   requests and analyses, calls `draftBrief`, stores a `decision_briefs` row with
   `status='draft'`.
2. `PATCH /briefs/:id/decision` records `approved|rejected` with `decidedBy`,
   `decidedAt=now`, `decisionNote`. A decided brief cannot be re-decided (`conflict`).
3. `POST /briefs/:id/drafts` requires an approved brief, calls
   `draftStakeholderMessage` for the audience, stores a draft with `status='draft'`.
4. `PATCH /drafts/:id` lets a human edit the body and/or mark it `approved` with
   `updatedBy`. Sending is outside the system: "approved" means ready to send; no
   email or chat integration is in scope.

## Prompt handling

- Prompt text lives in `apps/api/prompts/{analyze,dedupe,cluster,score,brief,stakeholder}.md`,
  one file per capability, each with a `version:` header line. The loader and the
  pinned versions live in `apps/api/src/intelligence/prompts/` (`prompt-loader.ts`,
  `prompt-versions.ts`, `PROMPT_VERSIONS`); a header that does not match the pinned
  version fails at boot. `{{var}}` placeholders are filled by the adapter.
- Request text is untrusted: it is placed inside delimited data blocks
  (`<request ref="r1">…</request>`, text escaped), and the system prompt instructs
  the model that content within those blocks is data, never instructions (ADR 0006).
  Requests are referenced by short refs `r1..rN`, never by UUID; the adapter maps
  refs back and rejects unknown or repeated refs.
- The model receives exactly one tool per call (`record_*`), whose JSON schema is
  generated from the output zod schema (`zod-json-schema.ts`); the tool has no side
  effects. `tool_choice` is `{ type: 'auto', disable_parallel_tool_use: true }`
  because the default model rejects a forced `tool_choice`; a response without the
  tool call is treated as a validation failure (ADR 0003 amendments).
- On zod or semantic validation failure the call is retried once with the error
  appended as an `is_error` tool result; a second failure throws
  `IntelligenceUnavailableError`. A `refusal` stop reason throws immediately.
- Each call sets `max_tokens` per capability (2048..4096), `output_config.effort:
  'low'`, a 30 s client timeout with SDK `maxRetries: 2`, and logs an
  `intelligence.call` line with `promptVersion`, `model`, attempt, latency,
  input/output tokens and outcome. Prompt text and model output are not logged.
- The model returns only the four judged criteria for priority; `demand` and the
  total `score` are computed by the application (`demandFromVotes`,
  `computePriorityScore`).
- Model id comes from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).

## Error taxonomy

Global exception filter returns `ErrorEnvelope`; `code` is one of
`validation` (400), `auth` (401/403, reserved, unused without auth), `not_found`
(404), `conflict` (409), `rate_limited` (429, from `RateLimitGuard`, with a
`Retry-After` header), `dependency` (503, AI provider or database unavailable),
`internal` (500). `correlationId` comes from the `x-correlation-id` request header
or is generated at the edge and echoed back. Transport-level rejections reuse the
`validation` code with a non-default status (`RequestRejectedError`): 415 for a
non-JSON `Content-Type` on `POST`/`PATCH`/`DELETE`, 413 for a body over 64 kB, 400
for malformed JSON, all with fixed messages that never echo the body
(`docs/security-review.md`, fixes 3 and 4).

## Environment variables

| Name | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | no | unset -> `HeuristicProvider` | Enables `AnthropicProvider` |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-5-5` | Model id for all calls |
| `DATABASE_URL` | no | unset -> SQLite file `./data/fis.sqlite` | `postgres://…` switches driver |
| `PORT` | no | `3001` | API listen port |
| `WEB_ORIGIN` | no | `http://localhost:3000` | CORS allow-origin |
| `NEXT_PUBLIC_API_URL` | no (web) | `http://localhost:3001/api/v1` | Web -> API base URL; its origin is also allowed in the web CSP `connect-src` |
| `THROTTLE_WINDOW_SECONDS` | no | `60` (1..3600) | Length of the per-IP rate-limit window |
| `THROTTLE_LIMIT` | no | `120` (1..100000) | Requests per window per IP on every endpoint |
| `THROTTLE_STRICT_LIMIT` | no | `20` (1..100000) | Requests per window per IP on submit and the AI endpoints, applied on top of the global limit |
| `AI_DAILY_CALL_BUDGET` | no | `500` (0..1000000) | Anthropic calls per UTC day per process; past it the heuristic provider answers; `0` disables the Anthropic path |

`.env.example` lists names only, no values beyond the documented defaults as
comments. Env is validated once at boot by the `config` module's zod schema
(`apps/api/src/config/env.schema.ts`); an empty value counts as unset.

## AI evaluation plan

Golden set at `apps/api/evals/golden.json` (`golden@2`), runner `apps/api/evals/run.ts`,
scorers in `scorers.ts`, LLM judge in `need-judge.ts`, report in `RESULTS.md`
(heuristic) or `RESULTS.anthropic.md` (Anthropic), one summary row per run appended
to `history.json`. `apps/api/evals/README.md` documents the scorers and the heuristic
calibration sweep.

- 12 dedupe cases (`expectedDuplicates` and `mustNotMatch` per query), including
  exact-identifier and paraphrase cases and hard near misses; scored by precision
  and recall at the port default 0.6, a threshold sweep, near-miss violations and
  separation checks (duplicates >= 0.6, distinct pairs < 0.4).
- 5 scoring cases with an expected score band, plus 5 ordered pairs.
- 2 need-extraction cases: keyword inclusion for the heuristic provider; an LLM
  judge (`need-judge@1`, three yes/no criteria) for the Anthropic provider, with
  missing keywords kept as a diagnostic.
- Cluster checks: duplicate pairs in the same theme, unrelated pairs apart.

Scripts (`apps/api/package.json`): `pnpm --filter @fis/api eval` (heuristic, offline)
and `pnpm --filter @fis/api eval:anthropic` (needs `ANTHROPIC_API_KEY`; optional
`ANTHROPIC_MODEL`, `ANTHROPIC_JUDGE_MODEL`). A prompt, threshold or rule change is
accompanied by the regenerated report and history row. The Anthropic run has not been
executed in this repository (`RESULTS.anthropic.md` does not exist).

## Success metrics

1. Median triage time per request (submit -> first status change by a human):
   target under 1 business day once the system is in use; baseline measured from
   the first two weeks.
2. Duplicate rate: merged requests / total requests. The AI target is that at least
   80% of human-confirmed merges were surfaced as a candidate at submit time.
3. Time-to-stakeholder-update: brief approval -> all three audience drafts
   approved; target under 2 hours.

All three are derivable from `created_at`, `decided_at` and `updated_at` columns;
no extra telemetry table is needed for v1.

## Security, Access and Redaction note

- No authentication is in scope (ADR 0005). `voterKey` is an anonymous browser id
  generated client-side and stored in `localStorage`; it is not a credential and
  vote fraud is accepted for v1. `decidedBy` is a free-text display name entered
  through the PM toggle. Production path: SSO + RBAC, `decidedBy` derived from the
  session.
- PII: the only personal data is `authorName`, `decidedBy` and `updatedBy` display
  names. They are never logged; log lines carry ids only.
- Access / Redaction (`rules/llm-apps.md` RAG section): the system has no retrieval
  index over private documents. The "corpus" passed to the model is the set of
  feature requests that every user of the instance can already read in the list
  endpoint, so there is no per-chunk ACL to enforce, no cross-tenant leak surface,
  and no principal-scoped cache. Request text is delimited as untrusted data and
  outputs are schema-validated (ADR 0006). Because PII is limited to author display
  names and those are not sent to the model (only id, title, description, votes,
  status reach the prompt), pre-index and pre-prompt redaction rules are not
  applicable. If private documents or user identities are ever added to the model
  context, this note is void and both rule sets apply.
- Prompt injection: no tool with side effects is exposed to the model; all state
  changes are separate human-invoked endpoints.
- Transport controls added after the security review (`docs/security-review.md`,
  which records the findings, the fixes and the accepted limitations): a per-IP
  fixed-window rate limit (global and strict, `apps/api/src/security/`), a
  per-process daily AI call budget (`apps/api/src/ai-budget/`), a JSON
  content-type gate on every non-GET request, fixed-message body-parser
  rejections, security headers and no `X-Powered-By` on both apps, an append-only
  `feature_request_decisions` log written in the merge and status transactions,
  immutable approved drafts (409), and a `page` cap of 10000. The rate limit and
  budget live in process memory: a restart resets them, instances do not share
  them, and clients behind one proxy share one bucket. The free-text
  `decisionNote` reaches the model prompt unredacted.

## Risks, assumptions, tradeoffs

| Item | Kind | Mitigation |
|---|---|---|
| TF-IDF cosine is weak on short paraphrases | risk | Raw cosine calibrated onto the port's threshold scale on the golden set (ADR 0008); label shown so users do not over-trust it |
| Full-corpus prompt for clustering does not scale past a few hundred requests | tradeoff | Bounded to 500 most recent; embeddings + pgvector is the production path (ADR 0002) |
| Anonymous votes can be gamed | assumption | Accepted for v1; documented production path |
| Re-clustering replaces themes and their ids | tradeoff | Resolved: themes referenced by a brief are kept (FK `ON DELETE RESTRICT`, `deleteUnreferencedExcept`); see Resolved open question 2 |
| SQLite JSON columns cannot be indexed for `sort=priority` | tradeoff | Sort in SQL on the denormalised `analyses.priority_score` column, nulls last |
| Model output quality varies by prompt version | risk | Golden-set eval before any prompt change ships |

## Acceptance Criteria

Status column: `code` means the criterion was verified by reading the implementation
named; `run` means it also needs a live run that this reconciliation did not perform.

- [x] (code) `@fis/shared` compiles standalone against `zod` only (`packages/shared/package.json`, `tsconfig.build.json`); `pnpm -r typecheck` is the root script. Not re-run here.
- [x] (code) `@fis/shared` exports, from `src/index.ts`, every schema and type named in "Frozen contracts", and `SCORING_WEIGHTS` sums to 1 (`scoring.ts`).
- [x] (code) `IntelligenceService` is a TypeScript interface with the six methods (`intelligence-port.ts`); `AnthropicProvider` and `HeuristicProvider` implement it.
- [x] (code) Every endpoint in the API table has a request and a response schema in `api.ts`; controllers validate with `ZodValidationPipe`.
- [x] (code) `POST /feature-requests` returns a top-level `provider` (not a per-candidate field; ADR 0009); with `ANTHROPIC_API_KEY` unset it is `heuristic` and the web app renders `ProviderBadge` on every AI artefact.
- [ ] (run) With `ANTHROPIC_API_KEY` unset the API boots, `GET /health` reports `provider: 'heuristic'`, and every intelligence endpoint responds without network access. Code path verified (`intelligence.module.ts`, `HeuristicProvider` has no network client); not run here.
- [x] (code) No provider or AI-path endpoint changes `status`, `mergedIntoId`, brief `status` or draft `status`; the merge, status, decision and draft PATCH bodies require `decidedBy` / `updatedBy` (`ActorName`, zod).
- [x] (code) Merge runs in one transaction and re-points or discards source votes (`FeatureRequestMergeService`). Not exercised against a database here.
- [x] (code) `PATCH /briefs/:id/decision` on a decided brief and `POST /briefs/:id/drafts` on a non-approved brief throw `conflict` (`BriefsService`, `StakeholderDraftsService`).
- [x] (code) `GlobalExceptionFilter` returns `ErrorEnvelope`; the correlation id echoes a well-formed `x-correlation-id` (pattern `^[A-Za-z0-9._:-]{1,128}$`) or is generated (`correlation-id.middleware.ts`).
- [x] (code) `GET /feature-requests` defaults to `limit=20`, caps at `100`, returns `{ items, total, page, limit }` (`PaginationQuery`).
- [x] (code) `AnthropicProvider` zod-validates every output, retries once with the error appended, sets `timeout` and `max_tokens`, reads `ANTHROPIC_MODEL` with default `claude-sonnet-5-5`. Not run against the live API in this repository.
- [x] (code) Prompts live in `apps/api/prompts/*.md` with a pinned `version:` header; every stored AI artefact carries `promptVersion`. The golden set lives in `apps/api/evals/`.
- [x] (code) `docs/adr/README.md` indexes ADRs 0001..0009 and each ADR records at least one rejected alternative.
- [x] (code) `.gitignore` excludes `node_modules`, `dist`, `.next`, `*.sqlite`, `.env`; `.env.example` contains the ten variable names (the original six plus `THROTTLE_WINDOW_SECONDS`, `THROTTLE_LIMIT`, `THROTTLE_STRICT_LIMIT`, `AI_DAILY_CALL_BUDGET`) and no values.

## Out of Scope

- Authentication, authorization, multi-tenancy (ADR 0005 names the production path).
- Sending stakeholder messages (email, Slack); "approved" is the terminal state.
- Embeddings, vector search, pgvector, or any retrieval index; the model sees the
  bounded request corpus directly.
- Automated tests (opt-in per `rules/verification.md`; none exist). The eval harness
  runner was built after all (`apps/api/evals/run.ts`), so it is no longer out of scope.
- Attachments, comments, or any field on a request beyond title/description/author.
- Historical theme versions or theme editing by humans.
- A shared (multi-instance) rate-limit or budget store; the in-memory ones that
  exist are per process.
- CI, Docker, deployment configuration.

## Open Questions

1. `GET /feature-requests/:id` response shape: the brief says "with analysis"; this
   spec adds `votes` and `mergedRequests`. Confirm or trim.
2. Re-clustering strategy: full replace (as specified) leaves briefs pointing at
   deleted theme ids. Options: keep old themes with an `archived` flag, or forbid
   deleting a theme referenced by a brief. Not decidable from the brief.
3. Whether `POST /intelligence/analyze/:id` should be invoked automatically by the
   API after submit (background) or only by the web app; the spec assumes the web
   triggers it so the submit path stays fast.
4. `priority` sort when a request has no analysis: specified here as "nulls last";
   confirm.
5. Heuristic scoring inputs: `demand` can be derived from `voteCount / maxVoteCount`;
   `reach`, `impact`, `strategicFit`, `effortInverse` have no data source and will be
   rule-based on keyword lists. Confirm that a transparent, admittedly crude
   heuristic is acceptable versus leaving those at a fixed 50.
6. Should `decidedBy`/`updatedBy` be free text (assumed) or constrained to a
   configured list of PM names while auth is absent?

## Resolved open questions

Resolved 2026-10-06. These supersede the matching Open Questions above and any
conflicting sentence in "Sequences" or "Risks"; `@fis/shared` encodes them.

1. `GET /feature-requests/:id` returns `{ request, analysis | null, votes, mergedRequests }`
   as specified (`GetFeatureRequestResponse`).
2. A theme referenced by a decision brief is never deleted. Re-clustering replaces
   `theme_members` (and `feature_requests.theme_id`) in one transaction and deletes
   only unreferenced themes; a theme left with zero members is hidden from
   `GET /themes`. `Theme.requestIds` therefore stays `min(1)`.
3. `POST /feature-requests` runs `findDuplicates` synchronously and returns the
   candidates; no analysis is written. Full analysis runs only through
   `POST /intelligence/analyze/:id`, which the web app calls after a successful submit.
4. `sort=priority` orders by `priorityScore` descending with unanalysed requests last;
   `FeatureRequestListItem.priorityScore` is absent for them.
5. The heuristic scorer derives `demand` from `voteCount / maxVoteCount` and `reach`,
   `impact`, `strategicFit`, `effortInverse` from documented keyword rules (documented
   beside the heuristic provider). Every result it produces carries
   `provider: 'heuristic'` and no `model`. The aggregate is `computePriorityScore`
   from `@fis/shared`, never computed by a provider ad hoc.
6. `decidedBy` / `updatedBy` are free text, trimmed, 1..80 characters (`ActorName`),
   while authentication is absent. The status and merge endpoints also persist the
   actor, timestamp and note on `feature_requests` (`decided_by`, `decided_at`,
   `decision_note`, ADR 0009).

The former contract note about a missing `provider` on the submit response is
resolved: `CreateFeatureRequestResponse` carries a top-level `provider` (ADR 0009).

## Implementation notes (2026-10-06)

Facts a reader of this spec needs that the sections above do not state, each read
from the code:

- Units that delivered it: wave 1 contracts + docs (`packages/shared`, `docs/`);
  wave 2 backend including database (`apps/api/src/**` except `intelligence`), AI
  module (`apps/api/src/intelligence`, `apps/api/prompts`, `apps/api/evals`),
  frontend (`apps/web`). `docs/tickets/README.md` maps tickets to these units.
- Both drivers run migrations at boot (`migrationsRun: true`, `synchronize: false`,
  `data-source-options.ts`); there are two migrations,
  `1759780000000-initial-schema.ts` and `1759790000000-feature-request-decisions.ts`
  (ADR 0002 and 0009 amendments).
- Submit-time dedupe tries the active provider, then the heuristic provider; when
  both fail the response carries empty candidates and the last provider's label.
- `FeatureRequestAnalysisService` recomputes `priority.score` with
  `computePriorityScore` before storing, regardless of provider.
- Re-clustering is transactional: all `theme_members` are deleted, `theme_id`
  cleared, new themes inserted, and themes not referenced by a brief are deleted
  (`ThemesRepository.deleteUnreferencedExcept`). Member-less themes are hidden from
  `GET /themes`.
- Heuristic duplicate `similarity` is calibrated onto the port scale (ADR 0008).
- Seed data: `pnpm --filter @fis/api seed` inserts 18 requests across five themes,
  idempotent by fixed ids (`apps/api/src/database/seed/`).
- Web: PM mode is a `localStorage` toggle with an `actingAs` name used as
  `decidedBy` / `updatedBy`; `voterKey` is a random 32-hex string in `localStorage`;
  duplicate hints appear after submit, not while typing; merge requires a
  confirmation checkbox. Pages: `app/(discover)/page.tsx`, `app/submit`,
  `app/requests/[id]`, `app/themes`, `app/triage`.
- Not implemented: full-text search (search is `LIKE`), auth, any outbound send,
  automated tests, a live run of the Anthropic path in this repository, a
  dependency CVE audit. Rate limiting is implemented (per IP, in process memory).
