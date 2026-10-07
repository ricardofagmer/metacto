# FIS-15: README and demo script

| Field | Value |
|---|---|
| Status | done |
| Owner unit | contracts + docs (the former U6) |
| Scope | `README.md`, `docs/demo.md` |
| Depends on | FIS-11, FIS-12, FIS-13 |
| Implemented in | `README.md`, `docs/demo.md`, `docs/security-review.md` (linked from the README limitations section) |

Reconciliation note: the demo script drops "weight change" and "mark-as-sent";
neither exists (FIS-8, FIS-10). The eval commands are
`pnpm --filter @fis/api eval` and `pnpm --filter @fis/api eval:anthropic`. The
README's "Five-minute Loom script" section was moved to `docs/demo.md` and the
README links to it.

## Scope

Top-level README (what the system is, architecture summary, how to run with
and without an API key, how to run the evals, limitations including no auth)
and a step-by-step demo script that walks the triage workflow on the seed
data.

## Acceptance criteria

- [x] Every command in the README is copied from the workspace scripts (`package.json`, `apps/api/package.json`, `apps/web/package.json`). Not re-run as part of this reconciliation.
- [x] README states the no-auth limitation and the heuristic fallback behavior plainly ("Assumptions, risks and known limitations", "Fallback scope").
- [x] Demo script covers: submit with a duplicate hint, vote-instead, merge, re-cluster, score breakdown, brief approve, stakeholder draft. "Weight change" is dropped: weights are a constant (ADR 0007).
- [x] README links to the PRD (`docs/prds/feature-intelligence-system.md`) and the ticket index (`docs/tickets/README.md`).

## Dependencies

All web tickets, so the demo describes real screens.
