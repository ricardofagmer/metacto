# Tickets: Feature Intelligence System

Work breakdown for `docs/prds/feature-intelligence-system.md`. One file per
ticket. Status and `Implemented in` were reconciled with the code on 2026-10-06:
`done` means the code verifiably meets the acceptance criteria as written or as
amended in the ticket; `partial` means it ships with a named gap; `todo` means
nothing exists.

Owner units and the directories they own (disjoint; no two units write the
same path). The PRD and early ticket drafts named these U1..U6 and a
`packages/contracts` package; the real names are below.

| Unit | Wave | Owns |
|---|---|---|
| contracts + docs | 1 | `packages/shared` (`@fis/shared`), workspace root config, `docs/` |
| backend incl. database | 2 | `apps/api/src/**` except `intelligence/` (`config`, `common`, `database`, `feature-requests`, `votes`, `analyses`, `themes`, `briefs`, `health`) |
| ai module | 2 | `apps/api/src/intelligence/**`, `apps/api/prompts/**`, `apps/api/evals/**` |
| frontend | 2 | `apps/web` |

| ID | Title | Unit | Depends on | Status | Implemented in |
|---|---|---|---|---|---|
| [FIS-1](FIS-1.md) | Shared contracts and workspace | contracts + docs | - | done | `packages/shared/src/*.ts`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`, `.gitignore` |
| [FIS-2](FIS-2.md) | Database entities, migrations and seed | backend incl. database | FIS-1 | partial | `apps/api/src/database/**` (two migrations) |
| [FIS-3](FIS-3.md) | Feature requests and votes API | backend incl. database | FIS-1, FIS-2 | done | `apps/api/src/feature-requests/**`, `apps/api/src/votes/**`, `apps/api/src/config/**`, `apps/api/src/common/**`, `apps/api/src/security/**`, `apps/api/src/ai-budget/**` |
| [FIS-4](FIS-4.md) | Intelligence port and Heuristic provider | contracts + docs (port), ai module | FIS-1 | done | `packages/shared/src/intelligence-port.ts`, `apps/api/src/intelligence/providers/heuristic/**`, `apps/api/src/intelligence/intelligence.module.ts` |
| [FIS-5](FIS-5.md) | Gemini provider with structured output, retry and timeout | ai module | FIS-4 | partial | `apps/api/src/intelligence/providers/gemini/**`, `apps/api/src/intelligence/prompts/**`, `apps/api/prompts/*.md` |
| [FIS-6](FIS-6.md) | Duplicate detection on submit and merge flow | backend incl. database | FIS-3, FIS-4 | partial | `apps/api/src/feature-requests/feature-requests.service.ts`, `feature-request-merge.service.ts`, `feature-request-analysis.service.ts` |
| [FIS-7](FIS-7.md) | Clustering into themes | backend incl. database, ai module | FIS-3, FIS-4 | partial | `apps/api/src/themes/**`, `apps/api/src/intelligence/providers/heuristic/heuristic-cluster.ts`, `apps/api/prompts/cluster.md` |
| [FIS-8](FIS-8.md) | Priority scoring with explainable breakdown | backend incl. database, ai module | FIS-3, FIS-4, FIS-7 | partial | `packages/shared/src/scoring.ts`, `apps/api/src/analyses/**`, `apps/api/src/intelligence/providers/heuristic/heuristic-scoring*.ts`, `apps/api/src/intelligence/providers/demand.ts`, `apps/api/prompts/score.md` |
| [FIS-9](FIS-9.md) | Decision briefs with approve and reject | backend incl. database, ai module | FIS-8 | partial | `apps/api/src/briefs/briefs.*.ts`, `brief-subject.loader.ts`, `brief.mapper.ts`, `apps/api/prompts/brief.md`, `heuristic-templates.ts` |
| [FIS-10](FIS-10.md) | Stakeholder drafts | backend incl. database, ai module | FIS-9 | partial | `apps/api/src/briefs/stakeholder-drafts.*.ts`, `stakeholder-draft.mapper.ts`, `apps/api/prompts/stakeholder.md`, `apps/api/src/intelligence/prompts/stakeholder-brief.mapper.ts` |
| [FIS-11](FIS-11.md) | Web: submit with duplicate hints | frontend | FIS-1, FIS-6 | partial | `apps/web/src/app/submit/page.tsx`, `apps/web/src/features/submit/**` |
| [FIS-12](FIS-12.md) | Web: browse, discover and vote | frontend | FIS-1, FIS-3 | done | `apps/web/src/app/(discover)/page.tsx`, `apps/web/src/app/requests/[id]/page.tsx`, `apps/web/src/features/discover/**`, `features/request-detail/**`, `features/votes/**` |
| [FIS-13](FIS-13.md) | Web: themes and PM triage dashboard | frontend | FIS-7, FIS-8, FIS-9 | partial | `apps/web/src/app/themes/page.tsx`, `apps/web/src/app/triage/page.tsx`, `apps/web/src/features/{themes,triage,briefs,analysis,pm-mode}/**` |
| [FIS-14](FIS-14.md) | AI golden-set evaluation | ai module | FIS-4, FIS-5 | partial | `apps/api/evals/**`, `apps/api/package.json` (`eval`, `eval:gemini`) |
| [FIS-15](FIS-15.md) | README and demo script | contracts + docs | FIS-11, FIS-12, FIS-13 | done | `README.md`, `docs/demo.md` |

Tickets listing two units split along the unit boundary: the ai module owns the
provider capability and prompt; the backend owns the service, controller, DTO
wiring and persistence calls that use it. The port interface itself lives in
`@fis/shared` and belongs to the contracts unit.
