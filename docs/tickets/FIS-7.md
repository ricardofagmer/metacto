# FIS-7: Clustering into themes

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | backend incl. database (service, endpoints), ai module (`cluster` prompt and heuristic) |
| Scope | `apps/api/src/themes/**`, `apps/api/src/intelligence/**` (cluster capability), `apps/api/prompts/cluster.md` |
| Depends on | FIS-3, FIS-4 |
| Implemented in | `apps/api/src/themes/{themes.controller,themes.service,themes.repository,theme-members.repository,theme.mapper,themes.module}.ts`, `apps/api/src/intelligence/providers/heuristic/heuristic-cluster.ts`, `apps/api/prompts/cluster.md` |

## Scope

`POST /intelligence/cluster` clusters all non-merged requests into named themes
with a summary (`conflict` when fewer than two); `GET /themes` lists themes that
have members. Re-clustering is one transaction: delete all `theme_members`,
clear `feature_requests.theme_id`, insert the new themes and members, then delete
themes no longer referenced by a decision brief
(`ThemesRepository.deleteUnreferencedExcept`; the brief FK is `ON DELETE
RESTRICT`). Heuristic: average-linkage agglomerative clustering over TF-IDF
vectors (`MERGE_THRESHOLD = 0.2`, `MIN_THEME_SIZE = 2`).

Reconciliation notes: the module is `apps/api/src/themes/`, not
`feature-requests/themes/`; the prompt is `cluster.md`, not `cluster-themes*`.
There is no `GET /themes/:id` endpoint.

## Acceptance criteria

- [x] Each theme has `name`, `summary`, `requestIds` and `provider`. A distinct-submitter count is not computed.
- [x] Re-clustering replaces membership atomically; a provider failure throws before the transaction, leaving the previous clustering intact.
- [x] Heuristic clustering groups the golden corpus' duplicate pairs together (`apps/api/evals/RESULTS.md`, cluster rows). It has not been checked against the five seeded themes specifically.
- [x] Theme result records `provider` (and `model` for Anthropic).

## Dependencies

FIS-3 request listing, FIS-4 port.
