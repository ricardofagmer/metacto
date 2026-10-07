# Security review: Feature Intelligence System (2026-10-06)

Verdict: **MERGE WITH FIXES**. The fixes listed below landed; the findings marked
"accepted" remain open by design and are documented rather than hidden.

The review itself ran as a read-only pass over the API, the web app and the shared
contracts after wave 2 integration. Its raw output is not kept in the repository;
this file is the record, written from the code as it exists after the fixes. Every
control named here cites the file it was read from. Where a statement cannot be
verified from the code, it says so.

## What was reviewed

- `apps/api/src/**`: bootstrap (`main.ts`), controllers, services, the exception
  filter, the env schema, the migrations.
- `apps/web/next.config.ts` and `apps/web/src/lib/http.ts`.
- `packages/shared/src/**`: the zod contracts every boundary validates against.
- The prompt files under `apps/api/prompts/` and the prompt-data escaping
  (ADR 0006).

## What was not reviewed

- **No dependency CVE audit was run.** Neither `pnpm audit` nor any scanner output
  exists in the repository. The lockfile is pinned; nothing more is claimed.
- **The Gemini path was never run live.** Everything said about the model path
  is from reading `apps/api/src/intelligence/providers/gemini/**`; no request
  has been sent to the API from this repository (`apps/api/evals/RESULTS.gemini.md`
  does not exist). The review was written against the earlier Anthropic adapter;
  the provider was changed to Gemini on 2026-10-06 and the findings that concern
  spend, prompt delimiting and output validation are provider-independent, but the
  Gemini adapter code itself was not re-reviewed here.
- No penetration test, no fuzzing, no load test. The rate limiter and the daily
  budget are verified by reading, not by exercising.
- Deployment configuration: there is none (no Docker, no CI), so TLS termination,
  proxies and network placement were out of scope.

## Findings

| ID | Severity | Finding | Outcome |
|---|---|---|---|
| F1 | HIGH | **AI cost amplification.** With `GEMINI_API_KEY` set, five unauthenticated endpoints spend model tokens on demand. The only bounds were body size, zod field lengths, the 500-request corpus cap, the 40-candidate pool and the per-call output-token cap. | Mitigated, not fixed: per-IP rate limit and a daily call budget (fixes 1 and 2). Still not bound to a caller identity. By design (ADR 0005). |
| F2 | HIGH | **Anonymous merge, status and approval power.** `POST /feature-requests/:id/merge`, `PATCH /feature-requests/:id/status`, `PATCH /briefs/:id/decision` and `PATCH /drafts/:id` accept a self-declared `decidedBy` / `updatedBy`. A merge moves votes and marks the source `merged`; there is no unmerge endpoint. | Accepted by design (ADR 0005). Partially mitigated by the append-only decision log (fix 6) and the content-type gate (fix 3), which stops cross-site forms from issuing these calls from a victim's browser. The merge is still irreversible and the name is still unverified. |
| F3 | MEDIUM | **Vote stuffing.** `VoterKey` is any string of 8 to 64 characters (`packages/shared/src/vote.ts`); `(featureRequestId, voterKey)` uniqueness is the only control. Scripted votes raise `demand` (`voteCount / maxVoteCount`), which carries a 15 percent weight in `SCORING_WEIGHTS`. | Accepted, not fixed. Bounded only by the global rate limit (120 requests per minute per IP by default). Production path: `voterKey` replaced by the user id. |
| F4 | MEDIUM | **Cross-site simple requests to bodiless endpoints.** `POST /intelligence/analyze/:id` and `POST /intelligence/cluster` took no body, so a cross-site form or no-cors `fetch` could trigger them without a preflight. | Fixed (fix 3). |
| F5 | MEDIUM | **Body-parser errors leaked.** An oversized body became an internal 500; a malformed JSON body returned body-parser's own message, which can quote fragments of the rejected body. | Fixed (fix 4). |
| F6 | LOW | **No security headers on either app; `X-Powered-By` exposed.** | Fixed (fix 5). |
| F7 | LOW | **Decision history could be overwritten.** A second status change replaced `decided_by`, `decided_at` and `decision_note` on the request row (ADR 0009). | Fixed (fix 6). |
| F8 | LOW | **Approved stakeholder drafts could be edited after approval.** | Fixed (fix 7). |
| F9 | LOW | **Unbounded `page` on list endpoints** could reach the database as a huge `OFFSET`. | Fixed (fix 8). |
| F10 | INFO | **`decisionNote` reaches the model prompt.** `decidedBy` is stripped before a brief is sent to the model (`stakeholder-brief.mapper.ts` is an allowlist), but the free-text `decisionNote` is included. A PM who writes a person's name in the note sends it to the model provider and may see it in the generated draft. | Accepted and documented. No redaction exists. |

## Fixes that landed

Each item names the code and states the limits of what it does.

### 1. Per-IP rate limiting

`RateLimitGuard` (`apps/api/src/security/rate-limit.guard.ts`) is registered as a
global `APP_GUARD` by `SecurityModule` and runs on every routed HTTP handler. It
keys on `request.ip`; Express `trust proxy` is not enabled, so the socket address
is used and `X-Forwarded-For` cannot be spoofed to dodge the limit.

- Global limiter: `THROTTLE_LIMIT` requests (default 120) per
  `THROTTLE_WINDOW_SECONDS` (default 60) per IP, every endpoint including
  `GET /health`.
- Strict limiter: `THROTTLE_STRICT_LIMIT` (default 20) per window per IP, applied
  on top of the global one to handlers marked `@StrictRateLimit()`
  (`rate-limit.decorator.ts`): `POST /feature-requests`,
  `POST /intelligence/analyze/:id`, `POST /intelligence/cluster`,
  `POST /intelligence/briefs`, `POST /briefs/:id/drafts`.
- Rejection: HTTP 429, `ErrorEnvelope` with `code: 'rate_limited'` and message
  `Too many requests; retry later`, plus a `Retry-After` header in seconds. The
  client address is never logged; the filter logs `http.request_rejected` with the
  code and status only.
- Algorithm: `FixedWindowRateLimiter` (`fixed-window-rate-limiter.ts`), aligned
  fixed windows; the whole hit map is dropped at each window boundary.

Limitations:

- **Per-process memory.** Each API instance keeps its own counters; N instances
  allow N times the limit. A restart resets every counter.
- **Fixed window allows a 2x burst** around the boundary: a client can spend the
  full limit at the end of one window and again at the start of the next.
- **Clients behind one proxy or NAT share one bucket**, so one abusive client can
  lock out its neighbours, and a deployment behind a reverse proxy sees the proxy's
  address for everyone until `trust proxy` is configured (it is not today).
- It bounds request rate, not identity: an attacker with many addresses is bounded
  only by the daily budget below.

### 2. Daily AI call budget

`DailyCallBudget` (`apps/api/src/ai-budget/daily-call-budget.ts`) counts paid
model calls per UTC day in process memory. `BudgetedIntelligence`
(`budgeted-intelligence.ts`) wraps the boot-selected provider: every call
reserves one unit **before** the model is called (a failed or timed-out call still
counts), and once `AI_DAILY_CALL_BUDGET` (default 500) is reached every capability
is served by `HeuristicProvider` for the rest of the day, with the output labelled
`provider: 'heuristic'`. The first exhaustion each day logs
`intelligence.daily_budget_exhausted`. `AI_DAILY_CALL_BUDGET=0` disables the
Gemini path while leaving the key configured. When no key is set the boot
provider already is the heuristic and nothing is metered.

Limitations:

- **Per-process memory; a restart refills the budget.** The effective ceiling is
  budget x instances x restarts.
- **`GET /health` still reports the boot-time provider**
  (`HealthService` reads `IntelligenceInfoService.activeProvider()`, which wraps
  the unbudgeted `INTELLIGENCE_SERVICE`). After exhaustion the header badge says
  `gemini` while every new artefact says `heuristic`. The artefact label is the
  honest one.
- The budget is a count of calls, not of tokens or money; the per-call
  output-token cap is the only token bound.

### 3. JSON content-type gate

`jsonContentTypeMiddleware` (`apps/api/src/security/json-content-type.middleware.ts`)
rejects every request whose method is not `GET`, `HEAD` or `OPTIONS` unless its
`Content-Type` media type is `application/json` (parameters such as `charset` are
allowed). The rejection is HTTP 415, `code: 'validation'`, message
`Content-Type must be application/json`. This applies to bodiless endpoints too.
Because `Content-Type: application/json` is not CORS-safelisted, a cross-site
form or `fetch` must preflight, and the preflight response only allows
`WEB_ORIGIN` (`app.enableCors` in `main.ts`), so the browser blocks the request.
The web client sets the header on every non-GET call
(`apps/web/src/lib/http.ts`, `buildHeaders`).

Limitation: this stops browsers acting on a victim's behalf. A direct HTTP client
simply adds the header.

### 4. Body-parser errors as fixed envelopes

Nest's default body parser is disabled (`bodyParser: false` in `main.ts`) and a
JSON parser with `limit: '64kb'` is registered explicitly, followed by
`bodyParserErrorsMiddleware` (`apps/api/src/security/body-parser-errors.middleware.ts`).
It maps body-parser failures to `ErrorEnvelope` responses with fixed messages that
never echo the body:

| body-parser type | Status | Message |
|---|---|---|
| `entity.too.large` | 413 | `Request body exceeds the size limit` |
| `entity.parse.failed` | 400 | `Malformed JSON body` |
| `charset.unsupported` | 415 | `Unsupported body charset` |
| `encoding.unsupported` | 415 | `Unsupported body encoding` |
| any other 4xx | 400 | `Invalid request body` |

### 5. Security headers, no `X-Powered-By`

API (`apps/api/src/security/security-headers.middleware.ts`, a helmet-equivalent
without the dependency, registered before CORS in `main.ts`; `x-powered-by`
disabled): `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`,
`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`
(not `same-origin`, so the web app on another localhost port can read responses),
`Origin-Agent-Cluster: ?1`, `Referrer-Policy: no-referrer`,
`Strict-Transport-Security: max-age=31536000; includeSubDomains`,
`X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: off`,
`X-Download-Options: noopen`, `X-Frame-Options: DENY`,
`X-Permitted-Cross-Domain-Policies: none`, `X-XSS-Protection: 0`. The API sends
HSTS unconditionally; browsers ignore the header over plain HTTP, so it has no
effect on a local run.

Web (`apps/web/next.config.ts`, `headers()` on every route; `poweredByHeader:
false`): `Content-Security-Policy` with `default-src 'self'`, `script-src 'self'
'unsafe-inline'` (plus `'unsafe-eval'` outside production), `style-src 'self'
'unsafe-inline'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'
<API origin from NEXT_PUBLIC_API_URL>` (plus `ws:` outside production),
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
`frame-ancestors 'none'`; `X-Content-Type-Options: nosniff`;
`Referrer-Policy: strict-origin-when-cross-origin`; `X-Frame-Options: DENY`;
`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`;
and, only when `NODE_ENV=production`, `Strict-Transport-Security:
max-age=63072000; includeSubDomains`.

Limitation: **`script-src` includes `'unsafe-inline'`.** The App Router streams
RSC payloads and hydration bootstraps as inline scripts, and the app does not
render every page dynamically with a per-request nonce, so the CSP does not stop
injected inline script. It still restricts script and connection origins.

### 6. Append-only decision log

Table `feature_request_decisions` (migration
`apps/api/src/database/migrations/1759790000000-feature-request-decisions.ts`):
`id`, `feature_request_id` (FK, `ON DELETE RESTRICT`), `kind` in `('merge',
'status')` (database check), `decided_by`, `note`, `created_at`. A row is appended
inside the same transaction that saves the merge
(`FeatureRequestMergeService.merge`) or status change
(`FeatureRequestsService.updateStatus`). There is no outcome column; the resulting
status or merge target is on the request row. The repository exposes only
`append`; append-only is enforced by the absence of update and delete code, not by
the database. No endpoint reads the table.

### 7. Approved stakeholder drafts are immutable

`StakeholderDraftsService.update` (`apps/api/src/briefs/stakeholder-drafts.service.ts`)
updates conditionally on the draft still being editable
(`StakeholderDraftsRepository.updateEditable`); when the row is already
`approved` the update affects nothing and the service throws `ConflictError`
(HTTP 409, `An approved stakeholder draft is immutable`). Decided briefs were
already immutable the same way (`BriefsService`).

### 8. Pagination `page` capped

`PaginationQuery.page` is `int 1..10000` (`MAX_PAGE`, `packages/shared/src/common.ts`);
`limit` stays `1..100`. A larger page is a 400 `validation` error rather than an
`OFFSET` the database has to compute.

## Accepted limitations, in one place

- No authentication, no authorization, no caller identity (ADR 0005, amended).
- Merge cannot be undone; status, merge and approvals are anonymous.
- Vote stuffing via arbitrary `voterKey` values, bounded only by the rate limit.
- Rate limit and budget are per-process and in-memory; restart refills both;
  clients behind one proxy share one bucket; fixed window permits a 2x burst.
- `GET /health` reports the boot-time provider, not the budget state.
- Web CSP needs `'unsafe-inline'` for scripts.
- `decisionNote` is free text, reaches the model and the generated draft, and is
  not redacted.
- `feature_request_decisions` is append-only by convention in code; the database
  does not enforce it.
- Dependencies were not audited for CVEs; the Gemini path was not run live.

Do not expose this deployment beyond a trusted network without closing at least
the first two.
