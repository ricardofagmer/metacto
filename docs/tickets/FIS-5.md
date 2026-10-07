# FIS-5: Anthropic provider with structured output, retry and timeout

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | ai module (wave 2) |
| Scope | `apps/api/src/intelligence/providers/anthropic/**`, `apps/api/src/intelligence/prompts/**`, `apps/api/prompts/**` |
| Depends on | FIS-4 |
| Implemented in | `apps/api/src/intelligence/providers/anthropic/{anthropic.provider,anthropic-structured-call,anthropic-tools,anthropic-messages,anthropic-output.mappers,model-output.schemas,zod-json-schema}.ts`, `apps/api/src/intelligence/prompts/{prompt-loader,prompt-versions,prompt-data,stakeholder-brief.mapper}.ts`, `apps/api/prompts/{analyze,dedupe,cluster,score,brief,stakeholder}.md` |

## Scope

Implement the port against the Anthropic Messages API using tool-use for
structured output: one side-effect-free `record_*` tool per capability whose
JSON schema is derived from the zod output schema; `tool_choice: auto` with
parallel tool use disabled (the default model rejects a forced `tool_choice`), a
missing tool call counted as a validation failure; `output_config.effort: 'low'`;
one corrective retry with the validation error appended as an `is_error`
`tool_result`; 30 s client timeout and SDK `maxRetries: 2`; per-capability
`max_tokens` (2048..4096); requests referenced as `r1..rN`; `demand` and the
total score computed by the application. One versioned prompt file per
capability under `apps/api/prompts/`, pinned by `PROMPT_VERSIONS` and checked at
boot. Details in ADR 0003 (Amendments).

Reconciliation notes: the code lives under `providers/anthropic/`, not
`intelligence/anthropic/`. The timeout is a 30 s constant, not 20 s and not
configurable. Falling back to the heuristic provider on exhaustion happens only
on the submit-time `findDuplicates` call (FIS-6); every other capability
surfaces `IntelligenceUnavailableError` as HTTP 503 `dependency`.

## Acceptance criteria

- [x] Request text is passed as escaped, delimited data (`<request ref="...">`) with an explicit instruction in every system prompt to treat it as data (ADR 0006).
- [x] A response that fails schema or semantic validation is retried exactly once with the error appended; a second failure throws `IntelligenceUnavailableError`. The heuristic fallback applies on the submit path only.
- [x] Every call has a timeout and a `max_tokens` cap (constants, not configurable).
- [x] Prompt files carry a `version:` header recorded as `promptVersion` in the call log and on every stored artefact.
- [x] No API key or request text appears in logs or error messages (`intelligence.call` logs ids, versions, counts and outcome only).
- [ ] Live verification: the adapter has been typechecked and reviewed but not run against the Anthropic API in this repository (`apps/api/evals/RESULTS.anthropic.md` does not exist).

## Dependencies

FIS-4 port and heuristic provider.
