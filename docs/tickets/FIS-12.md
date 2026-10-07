# FIS-12: Web: browse, discover and vote

| Field | Value |
|---|---|
| Status | done |
| Owner unit | frontend (wave 2) |
| Scope | `apps/web/**` (list, search, request detail, vote) |
| Depends on | FIS-1, FIS-3 |
| Implemented in | `apps/web/src/app/(discover)/page.tsx`, `apps/web/src/app/requests/[id]/page.tsx`, `apps/web/src/features/discover/{filter-bar,discover-params,request-card}.ts(x)`, `apps/web/src/features/request-detail/**`, `apps/web/src/features/votes/{vote-button,voter-key}.ts(x)`, `apps/web/src/components/ui/{pagination,status-badge,states}.tsx`, `apps/web/src/lib/{api,http,config}.ts` |

## Scope

Server-rendered paginated request list with `q` search, `status` and `themeId`
filters and sort; request detail with analysis (need, candidates, priority
breakdown), vote count, status, and the merge pointer when merged; vote toggle
keyed by an anonymous `voterKey` generated once per browser and kept in
`localStorage` (ADR 0005).

Reconciliation notes: the voter is a random `voterKey`, not a self-declared
name.

## Acceptance criteria

- [x] List is server-rendered with pagination controls reflecting the API's `total`.
- [x] A duplicate vote shows the API's `conflict` error inline (`inline-failure.tsx`).
- [x] A merged request shows a link to its target (`mergedIntoId`).
- [x] Loading, error, empty and success states are rendered (`states.tsx`, `loading.tsx`, `error.tsx`).

## Dependencies

FIS-1 contracts, FIS-3 API.
