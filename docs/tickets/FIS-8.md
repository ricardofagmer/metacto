# FIS-8: Priority scoring with explainable breakdown

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | backend incl. database (analysis persistence, list provenance), ai module (`scorePriority` capability), contracts + docs (`SCORING_WEIGHTS`) |
| Scope | `packages/shared/src/scoring.ts`, `apps/api/src/analyses/**`, `apps/api/src/intelligence/**` (scoring capability), `apps/api/prompts/score.md` |
| Depends on | FIS-3, FIS-4, FIS-7 |
| Implemented in | `packages/shared/src/scoring.ts` (`SCORING_WEIGHTS`, `computePriorityScore`), `apps/api/src/analyses/{analyses.repository,analyses.service,analysis.mapper,priority-provenance}.ts`, `apps/api/src/feature-requests/feature-request-analysis.service.ts`, `apps/api/src/intelligence/providers/demand.ts`, `apps/api/src/intelligence/providers/heuristic/{heuristic-scoring,heuristic-scoring-rules}.ts`, `apps/api/src/intelligence/providers/gemini/` output mappers (`toPriorityScore`), `apps/api/prompts/score.md` |

## Scope

A priority score per request with a breakdown over five criteria (`reach`,
`impact`, `strategicFit`, `effortInverse`, `demand`, each 0..100), a rationale,
and the total `score = sum(breakdown[k] * SCORING_WEIGHTS[k])` computed by
`computePriorityScore` in `@fis/shared` (ADR 0007). `demand` is derived from
`voteCount / maxVoteCount` in code for both providers; the Gemini model
judges only the other four. The list endpoint exposes `priorityScore`,
`priorityProvider` and `priorityModel` and sorts on the denormalised
`analyses.priority_score`.

Reconciliation notes: the factors are not votes/source/recency/theme size; the
weights are a constant, not configuration, and there is no weights endpoint or
PM weight change (ADR 0007 rejected that).

## Acceptance criteria

- [x] Score response includes each criterion's value, the rationale and the total; weights are the published `SCORING_WEIGHTS` constant (the web `priority-breakdown` panel shows value and weight per criterion).
- [x] `demand` is computed in code (`demandFromVotes`); the model contributes the four judged criteria and the rationale; the total is recomputed by the application before storing.
- [ ] Changing a weight and re-scoring. Not applicable; weights are a constant.
- [ ] Weight changes through a config endpoint. Not implemented by decision (ADR 0007).

## Dependencies

FIS-3, FIS-4, FIS-7 theme membership.
