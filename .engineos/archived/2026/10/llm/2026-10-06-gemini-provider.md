---
status: done
domain: llm
spec: n/a — provider swap behind the existing IntelligenceService port, documented in ADR 0003 amendment
completed: 2026-10-06
---

# Replace Anthropic with Gemini Flash

## What was made
- providers/anthropic replaced by providers/gemini (GeminiProvider, @google/genai, one forced function call per request, zod validation, one corrective retry).
- Env vars GEMINI_API_KEY / GEMINI_MODEL (default gemini-2.5-flash); eval:gemini script.
- Shared Provider enum is now gemini | heuristic; migration 1759800000000-relabel-legacy-provider relabels legacy rows.
- apps/api tsconfig module set to node20 for the SDK typings.
- README, PRD, spec, ADR 0003/0009, tickets, flow and demo updated.

## Checklist
- [x] typecheck 3/3 and web lint green
- [x] docs corrected to forced function calling
- [~] live Gemini run: not done, no key available

## Human decisions
None fired. Open for the owner: keep the relabel migration or retain 'anthropic' as a read-only legacy value.

## Changes registered
See git log for branch feat/gemini-provider (renames of providers/anthropic to providers/gemini, new migration, doc edits).
