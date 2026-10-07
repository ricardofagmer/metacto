# FIS-10: Stakeholder drafts

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | backend incl. database (`briefs` module), ai module (`draftStakeholderMessage` capability) |
| Scope | `apps/api/src/briefs/stakeholder-drafts.*`, `apps/api/src/intelligence/**` (stakeholder capability), `apps/api/prompts/stakeholder.md` |
| Depends on | FIS-9 |
| Implemented in | `apps/api/src/briefs/{stakeholder-drafts.controller,stakeholder-drafts.service,stakeholder-drafts.repository,stakeholder-draft.mapper}.ts`, `apps/api/prompts/stakeholder.md`, `apps/api/src/intelligence/prompts/stakeholder-brief.mapper.ts`, `apps/api/src/intelligence/providers/heuristic/heuristic-templates.ts` (`draftStakeholderFromTemplate`) |

## Scope

`POST /briefs/:id/drafts` generates a draft for one audience (`requesters`,
`leadership`, `engineering`) from an approved brief; `GET /briefs/:id/drafts`
lists them; `PATCH /drafts/:id` lets a PM edit `body` and/or set `status:
'approved'` with `updatedBy`. The brief passed to the provider is a name-free
view (`toStakeholderBriefView`) so the decider's name never reaches the prompt
or the stored draft. The system never sends anything.

Reconciliation notes: audiences are requesters/leadership/engineering, not
requester/account owner/support. There is no `sent_at` or mark-as-sent; the
terminal state is `approved` with `updatedBy`/`updatedAt`. Regeneration adds a
new draft row; it does not replace an existing one.

## Acceptance criteria

- [x] Drafts can only be generated from an approved brief (`conflict` otherwise).
- [ ] One draft per audience per brief with replace-on-regenerate. Not enforced; each generation inserts a new draft.
- [ ] `sent_at` set by a mark-as-sent endpoint. Not implemented; `status: 'approved'` via `PATCH /drafts/:id` is the end state. No email or messaging dependency exists.
- [x] Draft records `provider`, `model` (Gemini only) and `promptVersion`.
- [x] An approved draft is immutable: `PATCH /drafts/:id` on it returns 409 `conflict` (`StakeholderDraftsService.update`, added after the security review).

## Dependencies

FIS-9 approved briefs.
