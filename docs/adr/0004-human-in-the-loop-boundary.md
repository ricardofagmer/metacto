# ADR 0004 — Human-in-the-loop decision states and agent autonomy boundary

Date: 2026-10-06
Status: accepted

## Context

The AI produces duplicate candidates, priorities, briefs and drafts that are
useful only if product leaders trust them. Trust requires that the system never
changes a product decision on its own, and that every decision is attributable.

## Decision

The AI recommends; humans decide. Concretely:

- `IntelligenceService` methods are pure with respect to persistence and never
  mutate `status`, `mergedIntoId`, theme membership of a brief, brief `status` or
  draft `status`.
- Decision states are explicit enums: request `open | under_review | planned |
  declined | merged`, brief `draft | approved | rejected`, draft `draft | approved`.
- Each transition is its own endpoint (`merge`, `status`, `decision`, draft
  `PATCH`) and requires a human identifier (`decidedBy` / `updatedBy`) plus an
  optional note; the API records who, when and the note.
- A decided brief is immutable; a merged request cannot change status again.
- Clustering writes themes (an AI artefact, not a decision) and is the one AI
  result persisted without a human step; it never touches request status.

## Alternatives rejected

- Auto-merge above a similarity threshold: saves clicks but a false positive
  silently destroys a request and its votes; irreversible without an audit trail.
- A single generic `PATCH /feature-requests/:id` that accepts any field: hides
  which transitions are decisions and makes `decidedBy` optional in practice.
- Storing decisions as free-text log lines instead of columns: not queryable for
  the success metrics (triage time, time-to-update).

## Consequences

- The autonomy boundary is enforceable by reading the port and the controllers;
  it is one of the spec's acceptance criteria.
- More endpoints than a CRUD design, each small.
