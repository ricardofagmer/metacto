# FIS-13: Web: themes and PM triage dashboard

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | frontend (wave 2) |
| Scope | `apps/web/**` (themes page, triage page, brief review, stakeholder drafts, merge and status forms, PM mode) |
| Depends on | FIS-7, FIS-8, FIS-9 |
| Implemented in | `apps/web/src/app/themes/page.tsx`, `apps/web/src/app/triage/page.tsx`, `apps/web/src/features/themes/{theme-card,recluster-button}.tsx`, `apps/web/src/features/triage/triage-item.tsx`, `apps/web/src/features/briefs/{brief-panel,brief-card,brief-decision-form,stakeholder-drafts,draft-editor,load-briefs}.ts(x)`, `apps/web/src/features/analysis/{priority-breakdown,underlying-need-panel,analyze-button}.tsx`, `apps/web/src/features/request-detail/{pm-actions,merge-form,merge-target-search,status-form}.tsx`, `apps/web/src/features/pm-mode/{pm-mode-store,pm-mode-toggle,pm-gate,pm-only}.ts(x)` |

## Scope

Themes page with re-cluster action and per-theme brief panel; triage page
ordered by `priorityScore` with provider badge, theme and brief status; priority
breakdown panel; merge form with target search and confirmation checkbox;
status form; brief generation, approve/reject with note; stakeholder draft
generation, editing and approval. PM mode is a `localStorage` toggle with an
`actingAs` name sent as `decidedBy` / `updatedBy`; stored briefs and drafts are
read back through `GET /briefs` and `GET /briefs/:id/drafts`.

Reconciliation notes: there is no mark-as-sent (drafts are approved, FIS-10)
and no scoring weights view beyond the per-criterion weight shown in the
breakdown panel (weights are a constant, FIS-8). There is no theme detail page.
Duplicate flags and pending merges are not shown on the triage list.

## Acceptance criteria

- [x] Score breakdown shows every criterion with its value and weight, and the rationale.
- [x] Merge requires an explicit confirmation checkbox; approve, reject and draft approval are explicit PM actions behind the PM toggle.
- [x] Every AI artefact shows `ProviderBadge` with the provider and model.
- [x] Re-cluster action shows pending state and refreshes the result without a full page reload (`recluster-button.tsx`).
- [ ] Mark-as-sent and a weights view. Not implemented; see notes.

## Dependencies

FIS-7, FIS-8, FIS-9 (and FIS-10 for the stakeholder draft view).
