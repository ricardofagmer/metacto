# Architecture Decision Records

One file per decision, numbered, never edited after acceptance; a change is a new
ADR that supersedes the old one. One exception is recorded below: ADRs 0002, 0003,
0005 and 0009 carry an "Amendments" section that reconciles the accepted text with
the implementation instead of a superseding ADR, because in each case the decision
itself stayed as made and only its mechanics or consequences changed (0003: call
mechanics; 0002: migrations on both drivers; 0005 and 0009: controls and the
decision log added after the security review, `docs/security-review.md`).

| ADR | Title | Status |
|---|---|---|
| [0001](0001-pnpm-monorepo-nest-next-shared.md) | pnpm monorepo: NestJS API, Next.js web, shared package | accepted |
| [0002](0002-sqlite-default-postgres-ready.md) | SQLite via TypeORM by default, Postgres via DATABASE_URL | accepted, amended 2026-10-06 |
| [0003](0003-intelligence-port-two-providers.md) | AI behind an IntelligenceService port with Anthropic and heuristic adapters | accepted, amended 2026-10-06 |
| [0004](0004-human-in-the-loop-boundary.md) | Human-in-the-loop decision states and agent autonomy boundary | accepted |
| [0005](0005-no-auth-anonymous-voter-key.md) | No auth in scope: anonymous voterKey, PM role as UI toggle | accepted, amended 2026-10-06 |
| [0006](0006-prompt-injection-stance.md) | Prompt-injection stance: request text is untrusted data | accepted |
| [0007](0007-scoring-weights-constant.md) | Scoring criteria as a single weights constant | accepted |
| [0008](0008-heuristic-duplicate-threshold.md) | Heuristic duplicate scores are calibrated onto the port's threshold scale | accepted |
| [0009](0009-provider-label-and-decision-audit-columns.md) | Provider label on every AI artefact; decidedBy columns on feature_requests | accepted, amended 2026-10-06 |

Template: Context, Decision, Alternatives rejected, Consequences.
