# ADR 0009 — Provider label on every AI artefact; decidedBy columns on feature_requests

Date: 2026-10-06
Status: accepted (amended 2026-10-06, see "Amendments")

## Context

Two gaps were found while implementing ADR 0003 and ADR 0004 against the spec:

1. The spec's acceptance criteria require the submit response's duplicate
   candidates to carry a provider label, but the frozen `DuplicateCandidate` has no
   `provider` field and neither did `CreateFeatureRequestResponse`. The list
   endpoint had the same problem: `priorityScore` alone does not say which engine
   produced it, so the triage page could not label a heuristic score honestly.
2. ADR 0004 says every decision records who, when and a note, but
   `feature_requests` had no columns for the merge and status-change decisions;
   only briefs had `decided_by`.

## Decision

**Provider label.** Every AI artefact and every response that carries one names
its provider, and `model` is present if and only if the provider is `anthropic`:

- `Analysis`, `Theme`, `DecisionBrief`, `StakeholderDraft` carry `provider` (and
  `model`, `promptVersion` where stored). `refineModelMatchesProvider`
  (`packages/shared/src/analysis.ts`) rejects an `Analysis` whose `model` presence
  disagrees with its provider.
- `CreateFeatureRequestResponse` gained a top-level `provider`
  (`packages/shared/src/api.ts`), set from the `findDuplicates` output that
  actually produced the candidates, so a heuristic fallback on submit is labelled
  `heuristic` even when Anthropic is the configured provider. When both providers
  fail, candidates are empty and `provider` is the last provider that failed
  (`FeatureRequestsService.findDuplicatesFor`).
- `FeatureRequestListItem` gained `priorityProvider` and `priorityModel`, present
  whenever `priorityScore` is (`AnalysesRepository.findPriorityProvenance`).
- `ClusterResponse` and `HealthResponse` carry `provider`.
- The web app renders the label through one component, `ProviderBadge`
  (`apps/web/src/components/ui/provenance.tsx`): `Rule-based (heuristic)` or
  `AI - anthropic <model>`. The triage list, request detail, themes, briefs,
  drafts, the submit result and the header health badge all use it.

**Decision audit columns.** `feature_requests` has nullable `decided_by`,
`decided_at` and `decision_note` (`apps/api/src/database/entities/feature-request.entity.ts`,
migration `1759780000000-initial-schema.ts`). `PATCH /feature-requests/:id/status`
and `POST /feature-requests/:id/merge` write them on the request whose state
changed (the merge writes them on the source); nothing on the AI path does. They
are the data behind the triage-time metric in the spec.

## Alternatives rejected

- An `isFallback: boolean` next to the provider (the PRD's wording): two fields
  for one fact, and "fallback" is not what the reader needs to know; which engine
  produced the result is.
- Adding `provider` to each `DuplicateCandidate`: all candidates in one response
  come from one call, so the label belongs on the response.
- A separate `decision_events` table: queryable, but the spec's metrics only need
  the latest decision per request, and ADR 0004 already rejected free-text logs in
  favour of columns; a history table is a later addition if one is needed.

## Consequences

- The three audit columns are database-only today: the `FeatureRequest` schema
  does not expose `decidedBy`/`decidedAt`/`decisionNote`
  (`packages/shared/src/feature-request.ts`), so the API returns them for briefs
  but not for requests. Exposing them is a contract change.
- The list card on the Discover page shows the score without the badge; the
  triage item and the detail page show the badge
  (`apps/web/src/features/triage/triage-item.tsx`,
  `features/request-detail/analysis-section.tsx`).
- `priorityProvider` on the list and `provider` on the submit response are
  additive contract changes made in `@fis/shared` with both consumers in the same
  change, as ADR 0001 requires.

## Amendments (2026-10-06, after the security review)

The rejected alternative "a separate `decision_events` table" was adopted in a
narrower form after the security review asked for a history that a later merge or
status change cannot overwrite. The three columns on `feature_requests` stay and
still hold the latest decision.

- **Table `feature_request_decisions`** (migration
  `1759790000000-feature-request-decisions.ts`, entity
  `feature-request-decision.entity.ts`): `id`, `feature_request_id` (FK to
  `feature_requests`, `ON DELETE RESTRICT`), `kind` (`merge` or `status`, enforced
  by check `chk_feature_request_decisions_kind`), `decided_by`, `note`,
  `created_at`. There is no outcome column: the row records that a decision of
  that kind was made, by whom and with which note, not the resulting status or
  merge target. Those are read from the request row.
- **Written in the same transaction as the decision.**
  `FeatureRequestMergeService.merge` appends a `merge` row against the source
  request; `FeatureRequestsService.updateStatus` appends a `status` row. Both
  run inside the `UnitOfWork` scope that saves the request, so the log and the
  row cannot disagree.
- **Append-only by code, not by the database.**
  `FeatureRequestDecisionsRepository` exposes only `append`; no code path updates
  or deletes a row. The database itself grants no such protection: a direct SQL
  session can edit the table. No endpoint reads the table yet.
