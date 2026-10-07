---
status: done
domain: general
spec: docs/specs/2026-10-06-feature-intelligence-system.md
risk: medium
autonomy: A2
completed: 2026-10-06
---

# Feature Intelligence System (Metacto technical assessment)

## What / Why / Scope
AI-first system that turns unstructured feature requests into product decisions: duplicate detection at submit, underlying-need extraction, theme clustering, explainable priority scoring, decision briefs and stakeholder drafts, with humans owning every decision. Greenfield pnpm monorepo: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (zod contracts), `docs/`.

## What was made
- Wave 1: PRD, spec, ADRs 0001-0007, tickets FIS-1..15; `@fis/shared` contracts and workspace (build and typecheck green).
- Wave 2: NestJS API with every route in `API_ROUTES` (curl-verified), TypeORM entities + migration + idempotent seed (18 requests); IntelligenceService port with AnthropicProvider (tool-use, zod-validated, one corrective retry) and HeuristicProvider (TF-IDF, calibrated duplicate scale); versioned prompts and a golden-set eval; Next.js app with Discover, Submit, Request detail, Themes and Triage screens and provider badges.
- Fix passes: GET briefs/drafts endpoints, priority provenance, heuristic dedupe calibration (recall 0% to 100%, precision 70%), decider name kept out of prompts.
- Security review (verdict MERGE WITH FIXES) and fixes: 415 content-type gate, fixed-message body-parser errors, security headers, per-IP rate limits, daily AI call budget, immutable approved drafts, append-only decision log, page cap, web CSP/headers.
- Docs: ADR 0003/0002/0005/0009 amendments, ADR 0008-0009, `docs/security-review.md`, `docs/demo.md`, README for reviewers.
- Final gate: `pnpm -r typecheck` green for shared, api, web; `pnpm -r lint` green for web (api and shared have no lint script). End-to-end API smoke on a scratch DB: submit returned duplicate candidates (0.72, 0.69), analyze, cluster, brief, approve, draft, list briefs all OK; 415 on wrong content-type; 0 error-level log lines.

## Known gaps (also in README and docs/security-review.md)
Anthropic path never run live; no authentication (ADR 0005); vote stuffing and anonymous irreversible merge accepted and documented; rate limiter and AI budget are per-process memory; CSP allows inline scripts; heuristic misses one hard near-miss (SMS reset vs reset email); no dependency CVE audit run; LIKE-based search.

## Checklist
- [x] Spec, ADRs, PRD, tickets written before code
- [x] Contracts frozen before fan-out (@fis/shared)
- [x] Backend, AI module, frontend implemented by specialist agents in disjoint scopes
- [x] Security review dispatched and must-fix items applied
- [x] Final gate: typecheck and lint, output shown
- [x] README and demo script for reviewers
- [x] prompts.txt maintained
- ~~Tests~~ not requested ([tests] skipped); a golden-set eval exists instead

## Human decisions
- 2026-10-06, user (Ricardo): requested the whole build and the project start. No hitl reason ids fired at classified tier medium (risk floor keywords from hooks were not classifications).
- Pending, not yet approved: creating the public GitHub repo and pushing (external effect). Requires explicit user approval; not performed.

## Changes registered
Output of `git add -A; git diff --cached --shortstat` before removing PROJECT_INDEX.json and .claude/launch.json from the index:
```
254 files changed, 21084 insertions(+)
```
Files per area: apps/api 129, apps/web 71, docs/tickets 16, packages/shared 14, docs/adr 10, root config 6, docs (spec, prd, security-review, demo) 4, README.md, prompts.txt. No renames; all files new (greenfield, first commit).
