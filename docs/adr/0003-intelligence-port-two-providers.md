# ADR 0003 — AI behind an IntelligenceService port with Gemini and heuristic adapters

Date: 2026-10-06
Status: accepted (amended 2026-10-06, see "Amendments"; first provider changed 2026-10-06, see "Provider change")

## Provider change (2026-10-06)

The first provider was changed from Anthropic (Claude) to Google Gemini Flash on
2026-10-06, per the owner's decision. This ADR was originally written and amended
against an Anthropic adapter (tool-use structured output). The text below has been
updated in place to describe the Gemini adapter; the Anthropic-specific details it
replaced were: one tool per call with `tool_choice: auto` and parallel tool use
disabled, `output_config: { effort: 'low' }`, SDK transport retries, an `is_error`
`tool_result` for the corrective retry, and the `ANTHROPIC_API_KEY` /
`ANTHROPIC_MODEL` variables (default `claude-sonnet-5-5`). The port, the heuristic
adapter, the selection rule and the label contract are unchanged; only the label
value moved from `'anthropic'` to `'gemini'`. Anthropic-specific code references
in earlier change records under `.engineos/archived/` and in `prompts.txt` are
historical and were not edited.

## Context

Six AI capabilities (duplicate detection, need extraction, clustering, priority
scoring, decision briefs, stakeholder drafts) must work for a reviewer with no API
key and must produce machine-readable output the rest of the system can trust.

## Decision

`packages/shared/src/intelligence-port.ts` defines `IntelligenceService` with six
methods and zod-typed inputs and outputs. Two adapters implement it in `apps/api`:

- `GeminiProvider` (SDK `@google/genai`): one forced function call per request
  (`FunctionCallingConfigMode.ANY` with a single `allowedFunctionNames` entry) whose
  schema is derived from the output zod schema; output zod-validated, with one
  corrective retry carrying the validation error, a per-call timeout and an
  output-token cap, model id from `GEMINI_MODEL` (default `gemini-2.5-flash`).
- `HeuristicProvider`: TF-IDF cosine similarity for duplicates and agglomerative
  clustering over the same vectors; rule-based scoring, need extraction and
  template-based briefs and drafts. No network.

The provider is selected once at boot: `GEMINI_API_KEY` present selects
Gemini, otherwise heuristic. Every output carries `provider: 'gemini' |
'heuristic'` and the UI labels it. The heuristic result is never presented as LLM
output. Gemini failures on the submit path fall back to the heuristic provider
for that call; elsewhere they surface as `dependency` errors.

## Alternatives rejected

- Gemini only, with the app refusing to start without a key: fails the
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

The original decision described a forced tool choice for the first provider. The
points below describe the implementation as documented after the provider change;
only the first item is specific to Gemini.

- **Structured output is one forced function call, validated by zod.** Each request
  offers a single function (`providers/gemini/gemini-tools.ts`) and forces it with
  `FunctionCallingConfigMode.ANY` and one `allowedFunctionNames` entry. The schema is
  converted by `gemini-json-schema.ts` to the keyword subset Gemini supports; length
  and pattern constraints go into description text. The function has no side effects.
  Zod and the semantic checks remain the trust boundary. The prompts already tell the
  model to respond by calling the function, so no prompt version changed. A response
  with no call is handled as a validation failure.
- **Retries.** The structured caller makes at most 2 attempts: one corrective retry
  after a zod or semantic validation failure, sending the model turn back (thought
  signatures kept) plus a `functionResponse` with the validation error. A second
  failure throws `IntelligenceUnavailableError`. `thinkingBudget` is 512 per call and
  256 for the judge.
- **Requests are referenced as `r1..rN`, not UUIDs.** `buildRequestRefs`
  (`apps/api/src/intelligence/prompts/prompt-data.ts`) assigns short refs to the
  corpus; the output schemas accept only `^r\d+$`, and `checkCandidateRefs` /
  `checkThemeRefs` reject a ref that is not in the input or is repeated, feeding the
  problem back as the corrective retry. Fewer output tokens and a hallucinated id is
  trivially rejected.
- **The application computes `demand` and the total score.** The model returns
  only `reach`, `impact`, `strategicFit`, `effortInverse` and a rationale
  (`JudgementBreakdown`); `demand` is `demandFromVotes(voteCount, maxVoteCount)`
  (`apps/api/src/intelligence/providers/demand.ts`) and `score` is
  `computePriorityScore` from `@fis/shared`. The prompts say so explicitly
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
- **Call log.** Each Gemini attempt logs `intelligence.call` with provider,
  capability, promptVersion, model, attempt, durationMs, token counts and outcome;
  prompt text and model output never reach logs. Heuristic calls are not logged.

Not yet exercised: the Gemini path has been typechecked and reviewed but, at the
date of this amendment, not run against the live API; `evals/RESULTS.gemini.md`
does not exist yet.
