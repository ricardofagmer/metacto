# FIS-6: Duplicate detection on submit and merge flow

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | backend incl. database (wave 2) |
| Scope | `apps/api/src/feature-requests/**` (submit-time dedupe, analysis endpoint, merge endpoint) |
| Depends on | FIS-3, FIS-4 |
| Implemented in | `apps/api/src/feature-requests/feature-requests.service.ts` (`findDuplicatesFor`), `apps/api/src/feature-requests/feature-request-merge.service.ts`, `apps/api/src/feature-requests/{feature-request-analysis.controller,feature-request-analysis.service}.ts`, `apps/api/src/analyses/**` |

## Scope

Duplicate candidates returned by `POST /feature-requests` from a synchronous
`findDuplicates` call over the bounded corpus (500 most recent non-merged
requests): the active provider first, then the heuristic provider; if both fail
the response carries empty candidates. The response's top-level `provider`
names the adapter that answered (ADR 0009). `POST /intelligence/analyze/:id`
runs the full analysis and persists it (need, candidates, priority) to
`analyses`. The PM merge endpoint transfers votes, marks the source `merged`
with `mergedIntoId`, and records `decidedBy`, `decidedAt`, `decisionNote` on
the source, all in one transaction.

Reconciliation notes: there is no live hints endpoint called while typing;
dedupe runs once, on submit. Submit-time candidates are not persisted; the
analysis endpoint is what stores candidates. "Merge event" is the
`decided_at` timestamp on the merged request; since the security review a
`merge` row is also appended to `feature_request_decisions` in the same
transaction (ADR 0009 amendments). There is no unmerge endpoint. The analyze
endpoint carries `@StrictRateLimit()` and its model call is counted by the daily
AI budget (`docs/security-review.md`).

## Acceptance criteria

- [ ] Hints endpoint called while typing. Not implemented; see notes.
- [x] Submit always succeeds regardless of provider state; candidates are returned in the response (stored only by the analysis endpoint).
- [x] Merge is PM-initiated only (`decidedBy` required); source votes whose `voterKey` already exists on the target are discarded, the rest re-pointed; target `voteCount` recomputed; the merged request stays readable with `mergedIntoId`.
- [x] Merge is recorded with `decided_by`, `decided_at` and `decision_note` on the source row (ADR 0009) and as an appended `feature_request_decisions` row of kind `merge`.

## Dependencies

FIS-3 request API, FIS-4 `findDuplicates`.
