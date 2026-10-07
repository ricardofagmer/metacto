# ADR 0005 — No auth in scope: anonymous voterKey, PM role as UI toggle

Date: 2026-10-06
Status: accepted (amended 2026-10-06, see "Amendments")

## Context

Authentication is not part of the evaluated scope, but the system needs to
prevent trivial double-voting and distinguish the requester view from the product
manager view.

## Decision

- `voterKey` is an anonymous identifier generated in the browser (random 32-hex
  string in `localStorage`) and sent in vote requests; uniqueness of
  `(featureRequestId, voterKey)` is a database constraint.
- The PM role is a UI toggle in the web app that reveals merge, status, decision
  and draft actions; the API does not check it. `decidedBy` and `updatedBy` are
  display names typed by the user.
- The `auth` error code is reserved in the taxonomy and unused.
- Documented production path: SSO (OIDC) in front of both apps, RBAC with
  `requester` and `product_manager` roles, `decidedBy` derived from the session
  claim rather than the body, and `voterKey` replaced by the user id.

## Alternatives rejected

- Minimal email + password auth: real security work (hashing, sessions, reset)
  with no reviewer value, and it would be thrown away for SSO.
- IP-based vote dedupe: breaks behind NAT and corporate proxies; worse than an
  anonymous key.
- Shipping the PM actions with a shared secret header: a credential in the
  browser is not access control and would set a bad precedent for the production
  path.

## Consequences

- Votes can be gamed by clearing storage; accepted for v1 and stated in the spec.
- The whole API surface is public on the configured origin; the deployment target
  for v1 is a trusted network or a demo host.

## Amendments (2026-10-06, after the security review)

The decision stands: there is still no authentication or authorization. The
security review (`docs/security-review.md`) rated two consequences of this ADR
HIGH and one MEDIUM. Fixes landed for the cost side; the consequences above are
restated here as the code now behaves. Each item names the code it was read from.

- **Rate limiting now exists, auth still does not.** `RateLimitGuard`
  (`apps/api/src/security/rate-limit.guard.ts`, registered as `APP_GUARD` by
  `SecurityModule`) applies a per-IP fixed-window limit to every routed HTTP
  handler (`THROTTLE_LIMIT`, default 120 per `THROTTLE_WINDOW_SECONDS`, default
  60) and a stricter one (`THROTTLE_STRICT_LIMIT`, default 20) to handlers marked
  `@StrictRateLimit()`: `POST /feature-requests`, `POST /intelligence/analyze/:id`,
  `POST /intelligence/cluster`, `POST /intelligence/briefs`,
  `POST /briefs/:id/drafts`. Exceeding either returns 429 with code `rate_limited`
  and a `Retry-After` header. The `rate_limited` code is no longer reserved.
- **AI spend is capped per day, not per caller.** `DailyCallBudget`
  (`apps/api/src/ai-budget/daily-call-budget.ts`) counts Anthropic calls per UTC
  day in process memory; past `AI_DAILY_CALL_BUDGET` (default 500, `0` disables
  the Anthropic path) `BudgetedIntelligence` routes every capability to the
  heuristic provider, labelled `heuristic`. This bounds the bill an anonymous
  caller can run up; it does not identify the caller.
- **Cross-site simple requests are blocked.** `jsonContentTypeMiddleware`
  (`apps/api/src/security/json-content-type.middleware.ts`) rejects every
  non-`GET`/`HEAD`/`OPTIONS` request without `Content-Type: application/json`
  with 415, including bodiless ones such as analyze and cluster. That header is
  not CORS-safelisted, so a cross-site form or `fetch` is forced into a preflight
  that the CORS allowlist (`WEB_ORIGIN`) refuses. Anyone who can issue a direct
  HTTP request is unaffected.
- **Merge, status and approval remain anonymous and merge cannot be undone.**
  `decidedBy` and `updatedBy` are still body fields. Every merge and status change
  now also appends a row to `feature_request_decisions` in the same transaction
  (`FeatureRequestMergeService.merge`, `FeatureRequestsService.updateStatus`), so
  there is an audit trail of who claimed to decide; there is no unmerge endpoint
  and no verification of the name. Accepted as a HIGH finding by design; the
  production path above (SSO, RBAC, session-derived `decidedBy`) is unchanged.
- **Vote stuffing is not fixed.** The API accepts any `voterKey` string of 8 to
  64 characters (`VoterKey`, `packages/shared/src/vote.ts`); the web app's random
  32-hex key is a convention the API cannot check. A script can vote with
  arbitrary keys up to the rate limit, which raises `demand`
  (`voteCount / maxVoteCount`, 15 percent of the priority score). Accepted as a
  MEDIUM finding; the production path replaces `voterKey` with the user id.
