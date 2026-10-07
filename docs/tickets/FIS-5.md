# FIS-5: Gemini provider with structured output, retry and timeout

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | ai module (wave 2) |
| Scope | `apps/api/src/intelligence/providers/gemini/**`, `apps/api/src/intelligence/prompts/**`, `apps/api/prompts/**` |
| Depends on | FIS-4 |
| Implemented in | `apps/api/src/intelligence/providers/gemini/{gemini.provider,gemini-structured-call,gemini-tools,gemini-messages,gemini-output.mappers,gemini-json-schema}.ts`, `apps/api/src/intelligence/prompts/{prompt-loader,prompt-versions,prompt-data,stakeholder-brief.mapper}.ts`, `apps/api/prompts/{analyze,dedupe,cluster,score,brief,stakeholder}.md` |

Provider change (2026-10-06): this ticket was first delivered as an Anthropic
adapter (tool-use structured output). The provider was replaced by Google Gemini
Flash on 2026-10-06 per the owner's decision; the text below describes the Gemini
adapter. See ADR 0003.

## Scope

Implement the port against the Google Gemini API (`@google/genai`) using one forced
function call per request for structured output: a single side-effect-free function
whose schema is derived from the output zod schema (`gemini-tools.ts`, converted by
`gemini-json-schema.ts`), forced with `FunctionCallingConfigMode.ANY` and one
`allowedFunctionNames` entry; the arguments are zod-validated, a missing call counted
as a validation failure; one corrective retry that sends the model turn back (thought
signatures kept) plus a `functionResponse` with the validation error;
`thinkingBudget` 512 (256 for the judge); a per-call timeout and an output-token cap; requests referenced as `r1..rN`; `demand` and the total score
computed by the application. Model id from `GEMINI_MODEL` (default
`gemini-2.5-flash`); the provider is enabled by `GEMINI_API_KEY`. One versioned
prompt file per capability under `apps/api/prompts/`, pinned by `PROMPT_VERSIONS`
and checked at boot. Details in ADR 0003 (Amendments).

Reconciliation notes: the code lives under `providers/gemini/`. Falling back to
the heuristic provider on exhaustion happens only on the submit-time
`findDuplicates` call (FIS-6); every other capability surfaces
`IntelligenceUnavailableError` as HTTP 503 `dependency`.

## Acceptance criteria

- [x] Request text is passed as escaped, delimited data (`<request ref="...">`) with an explicit instruction in every system prompt to treat it as data (ADR 0006).
- [x] A response that fails schema or semantic validation is retried exactly once with the error appended; a second failure throws `IntelligenceUnavailableError`. The heuristic fallback applies on the submit path only.
- [x] Every call has a timeout and an output-token cap (constants, not configurable).
- [x] Prompt files carry a `version:` header recorded as `promptVersion` in the call log and on every stored artefact.
- [x] No API key or request text appears in logs or error messages (`intelligence.call` logs ids, versions, counts and outcome only).
- [ ] Live verification: the adapter has been typechecked and reviewed but not run against the Gemini API in this repository (`apps/api/evals/RESULTS.gemini.md` does not exist).

## Dependencies

FIS-4 port and heuristic provider.
