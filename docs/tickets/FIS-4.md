# FIS-4: Intelligence port and Heuristic provider

| Field | Value |
|---|---|
| Status | done |
| Owner unit | contracts + docs (port, wave 1); ai module (provider, wave 2) |
| Scope | `packages/shared/src/intelligence-port.ts`, `apps/api/src/intelligence/**` (heuristic provider, provider selection, call log) |
| Depends on | FIS-1 |
| Implemented in | `packages/shared/src/intelligence-port.ts`, `apps/api/src/intelligence/providers/heuristic/{heuristic.provider,heuristic-dedupe,text-vectors,heuristic-cluster,heuristic-scoring,heuristic-scoring-rules,heuristic-need,heuristic-templates,heuristic-versions}.ts`, `apps/api/src/intelligence/providers/{output-guard,demand}.ts`, `apps/api/src/intelligence/{intelligence.module,intelligence.tokens,intelligence-info.service}.ts` |

## Scope

The `IntelligenceService` port with one method per capability: `findDuplicates`,
`analyze`, `cluster`, `scorePriority`, `draftBrief`, `draftStakeholderMessage`.
The deterministic `HeuristicProvider` for all six: TF-IDF cosine (calibrated
onto the port's threshold scale, ADR 0008) for duplicates, agglomerative
clustering over the same vectors, documented keyword rules for scoring, regex
patterns for the underlying need, templates for briefs and drafts. Provider
selection at boot in `intelligence.module.ts` by presence of
`GEMINI_API_KEY`; the heuristic provider is also registered under
`HEURISTIC_INTELLIGENCE_SERVICE` for the submit-time fallback.

Reconciliation notes: the port is named `IntelligenceService`, not
`IntelligenceProvider`; the methods are `analyze` (not `extractNeed`), `cluster`
(not `clusterThemes`) and `draftStakeholderMessage` (not
`draftStakeholderUpdate`). There is no `isFallback`; outputs carry `provider`
and `promptVersion` (for the heuristic, the algorithm revision in
`HEURISTIC_VERSIONS`). The heuristic scorer uses keyword rules plus
`demandFromVotes`; recency is not a factor.

## Acceptance criteria

- [x] Every port method returns an output whose `provider` equals the adapter's (`ensureValidOutput` validates against the output schema).
- [x] Heuristic provider works with no network and no API key.
- [x] Provider selection falls back to heuristic when no key is configured; every result is labelled `provider: 'heuristic'` and carries no `model`.
- [x] Call log: the Gemini adapter logs `intelligence.call` with capability, provider, model, promptVersion, attempt, latency, token counts and outcome, never request text. The heuristic provider does not log its calls.

## Dependencies

FIS-1 contracts.
