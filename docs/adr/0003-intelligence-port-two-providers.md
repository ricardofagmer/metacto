# ADR 0003 — AI behind an IntelligenceService port with Anthropic and heuristic adapters

Date: 2026-10-06
Status: accepted (amended 2026-10-06, see "Amendments")

## Context

Six AI capabilities (duplicate detection, need extraction, clustering, priority
scoring, decision briefs, stakeholder drafts) must work for a reviewer with no API
key and must produce machine-readable output the rest of the system can trust.

## Decision

`packages/shared/src/intelligence-port.ts` defines `IntelligenceService` with six
methods and zod-typed inputs and outputs. Two adapters implement it in `apps/api`:

- `AnthropicProvider`: one tool per call whose JSON schema is derived from the
  output zod schema, `tool_choice: auto` with parallel tool use disabled (a
  missing tool call is a validation failure, see Amendments), output zod-validated,
  one corrective retry with the validation error appended, per-call timeout and
  `max_tokens`, model id from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).
- `HeuristicProvider`: TF-IDF cosine similarity for duplicates and agglomerative
  clustering over the same vectors; rule-based scoring, need extraction and
  template-based briefs and drafts. No network.

The provider is selected once at boot: `ANTHROPIC_API_KEY` present selects
Anthropic, otherwise heuristic. Every output carries `provider: 'anthropic' |
'heuristic'` and the UI labels it. The heuristic result is never presented as LLM
output. Anthropic failures on the submit path fall back to the heuristic provider
for that call; elsewhere they surface as `dependency` errors.

## Alternatives rejected

- Anthropic only, with the app refusing to start without a key: fails the
  zero-setup requirement and makes the demo depend on a third party.
- Free-text completions parsed with regex: brittle, and it violates the
  structured-output rule that model output must be schema-validated before use.
- A single provider that silently degrades to heuristics without labelling: a
  reviewer could not tell which path produced a result, and the fallback would be
  mistaken for model quality.
- Embeddings API for dedupe in v1: better recall than TF-IDF, but requires a
  vector store and makes the no-key path impossible; deferred to the pgvector
  production path (ADR 0002).

## Consequences

- The port is a frozen contract; adding a capability means changing the interface
  and both adapters in one change.
- Prompt files are versioned and every stored artefact records `promptVersion` and
  `model`, so results are attributable.
- The heuristic provider sets the quality floor measured by the golden set.

## Amendments (2026-10-06, reconciled with the implementation)

The original decision said `tool_choice` is forced. The implementation differs in
the following ways; each item names the code it was read from.

- **`tool_choice` is `auto`, not forced.** The call sends
  `tool_choice: { type: 'auto', disable_parallel_tool_use: true }`
  (`apps/api/src/intelligence/providers/anthropic/anthropic-structured-call.ts`,
  `send()`). The reason recorded in the code: the current model
  (`claude-sonnet-5-5` and later) rejects a forced `tool_choice` and a
  non-default `temperature`. The single tool is therefore offered, and a response
  with no `tool_use` block for that tool is handled as a validation failure: the
  retry message asks the model to call the tool exactly once (and names
  `max_tokens` as the cause when `stop_reason` is `max_tokens`).
- **Effort is `low`.** Every call sets `output_config: { effort: 'low' }` because
  the work is classification-style and the thinking budget must fit inside
  `max_tokens`.
- **Retries are two layers.** The SDK client is built with `timeout: 30_000` and
  `maxRetries: 2` (transport-level retries for 408/409/429/5xx and connection
  errors, `anthropic.provider.ts`). On top of that the structured caller makes at
  most 2 attempts (`MAX_ATTEMPTS = 2`): one corrective retry after a zod or
  semantic validation failure, with the problem appended as an `is_error`
  `tool_result`. A second failure throws `IntelligenceUnavailableError`. A
  `stop_reason` of `refusal` throws immediately without a retry.
- **Requests are referenced as `r1..rN`, not UUIDs.** `buildRequestRefs`
  (`apps/api/src/intelligence/prompts/prompt-data.ts`) assigns short refs to the
  corpus; the tool schemas accept only `^r\d+$` (`model-output.schemas.ts`), and
  `checkCandidateRefs` / `checkThemeRefs` (`anthropic-output.mappers.ts`) reject a
  ref that is not in the input or is repeated, feeding the problem back as the
  corrective retry. Fewer output tokens and a hallucinated id is trivially
  rejected.
- **The application computes `demand` and the total score.** The model returns
  only `reach`, `impact`, `strategicFit`, `effortInverse` and a rationale
  (`JudgementBreakdown`); `demand` is `demandFromVotes(voteCount, maxVoteCount)`
  (`apps/api/src/intelligence/providers/demand.ts`) and `score` is
  `computePriorityScore` from `@fis/shared` (`toPriorityScore` in
  `anthropic-output.mappers.ts`). The prompts say so explicitly
  (`apps/api/prompts/score.md`, `analyze.md`). `FeatureRequestAnalysisService`
  recomputes the total once more before storing (ADR 0007).
- **Candidate pool is bounded before the model sees it.** For `findDuplicates`
  and `analyze`, TF-IDF (`rankSimilarRequests`, threshold 0) preselects at most
  40 corpus entries (`CANDIDATE_POOL_SIZE`); the model judges only those.
  Threshold, ordering and limit are applied by the application after the call
  (`toDuplicateCandidates`), so the contract holds even if the model ignores the
  instruction. The heuristic provider's own `similarity` is calibrated onto the
  caller scale (ADR 0008); the preselection here is not.
- **Fallback scope.** Falling back to `HeuristicProvider` happens only on the
  submit-time `findDuplicates` call (`FeatureRequestsService.findDuplicatesFor`);
  every other capability surfaces `IntelligenceUnavailableError` as HTTP 503
  `dependency` (`GlobalExceptionFilter`).
- **Heuristic `promptVersion`.** The heuristic path has no prompt, so its
  `promptVersion` names the algorithm revision (`heuristic-dedupe@1`, ...,
  `apps/api/src/intelligence/providers/heuristic/heuristic-versions.ts`).
- **Call log.** Each Anthropic attempt logs `intelligence.call` with provider,
  capability, promptVersion, model, attempt, durationMs, inputTokens,
  outputTokens and outcome (stop reason or `api_error_<status>`); prompt text
  and model output never reach logs. Heuristic calls are not logged.

Not yet exercised: the Anthropic path has been typechecked and reviewed but, at
the date of this amendment, not run against the live API; `evals/RESULTS.anthropic.md`
does not exist yet.
