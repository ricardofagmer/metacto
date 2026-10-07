# ADR 0007 — Scoring criteria as a single weights constant

Date: 2026-10-06
Status: accepted

## Context

Priority scoring must be explainable: a product leader has to see which criteria
produced a score and with what weight, and both providers must compute the same
aggregate from the same breakdown.

## Decision

`SCORING_WEIGHTS` in `@fis/shared` (`packages/shared/src/scoring.ts`) is the only
definition of the criteria and their weights:

```
{ reach: 0.25, impact: 0.25, strategicFit: 0.2, effortInverse: 0.15, demand: 0.15 }
```

The weights sum to 1. Both providers return a `breakdown` with one 0..100 value per
criterion and a rationale; the final `score` is the weighted sum computed by the
application, not by the model. The weights are passed to the model as input so its
rationale can reference them.

## Alternatives rejected

- Weights stored in the database and editable in the UI: flexible, but it makes
  historical scores incomparable without versioning and adds an admin surface
  that has no owner while auth is out of scope (ADR 0005).
- Letting the model produce the final score directly: not reproducible and not
  auditable; the same breakdown would yield different totals across calls.
- Per-environment weights via env vars: five more variables to validate for a
  value that should change by a reviewed PR, with its ADR, not by deployment.

## Consequences

- Changing a weight is a code change plus a note in this ADR's successor, and all
  stored scores before the change are recomputable from their stored breakdowns.
- `PriorityBreakdown` keys and `SCORING_WEIGHTS` keys are the same TypeScript
  type, so adding a criterion fails typecheck until every site is updated.
