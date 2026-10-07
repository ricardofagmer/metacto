# FIS-11: Web: submit with duplicate hints

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | frontend (wave 2) |
| Scope | `apps/web/**` (submit page and similar-requests panel) |
| Depends on | FIS-1, FIS-6 |
| Implemented in | `apps/web/src/app/submit/page.tsx`, `apps/web/src/features/submit/{submit-flow,submit-form,similar-panel}.tsx`, `apps/web/src/features/votes/{vote-button,voter-key}.ts(x)`, `apps/web/src/components/ui/provenance.tsx` |

## Scope

Submit form (title, description, author name). After a successful submit the
flow shows the duplicate candidates returned by `POST /feature-requests`, each
with similarity, rationale and a vote action on the existing request, labelled
with the response's `provider`, then triggers `POST /intelligence/analyze/:id`
and shows the underlying need when it arrives.

Reconciliation notes: there are no live hints while typing (no hints endpoint,
FIS-6) and no `source` field.

## Acceptance criteria

- [ ] Hints appear while typing. Not implemented; candidates appear after submit.
- [x] Loading, error, empty and success states are rendered for the candidate panel and the analysis step.
- [x] Voting on a candidate casts a vote on the existing request via the vote endpoint; it does not create a new request.
- [x] A heuristic result is visibly labelled (`ProviderBadge`: "Rule-based (heuristic)").
- [x] Form fields are labelled and keyboard-operable (native form controls, `fields.tsx`).

## Dependencies

FIS-1 contracts, FIS-6 submit-time dedupe.
