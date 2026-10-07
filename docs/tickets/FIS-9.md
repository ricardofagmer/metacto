# FIS-9: Decision briefs with approve and reject

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | backend incl. database (`briefs` module), ai module (`draftBrief` capability) |
| Scope | `apps/api/src/briefs/**`, `apps/api/src/intelligence/**` (brief capability), `apps/api/prompts/brief.md` |
| Depends on | FIS-8 |
| Implemented in | `apps/api/src/briefs/{briefs.controller,briefs.service,briefs.repository,brief-subject.loader,brief.mapper,briefs.module}.ts`, `apps/api/prompts/brief.md`, `apps/api/src/intelligence/providers/heuristic/heuristic-templates.ts` (`draftBriefFromTemplate`) |

## Scope

`POST /intelligence/briefs` generates a brief for a theme or a single request
(`BriefSubject`, exactly one): `recommendation`, `evidence[]`, `risks[]`,
`openQuestions[]`, stored with `status: 'draft'`. `PATCH /briefs/:id/decision`
records `approved | rejected` with `decidedBy`, `decidedAt`, `decisionNote`; a
decided brief returns `conflict` on a second decision. `GET /briefs` lists
briefs by `themeId`, `featureRequestId` or `status`.

Reconciliation notes: evidence items are free-text strings; the model is asked
to cite request refs inside them, but the application does not validate that an
evidence item names an existing request id. There is no "options" field; the
contract has recommendation, evidence, risks and open questions.

## Acceptance criteria

- [ ] Every evidence item cites an existing request id, validated by the application. Not enforced; evidence is `string[]`.
- [x] Brief status transitions are `draft -> approved` or `draft -> rejected`, PM-initiated only (`decidedBy` required).
- [x] Decided briefs are immutable; a new draft is a new brief.
- [x] Brief records `provider`, `model` (Anthropic only) and `promptVersion`.

## Dependencies

FIS-8 scores and theme context.
