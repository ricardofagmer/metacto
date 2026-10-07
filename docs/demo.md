# Demo script (five-minute Loom)

Step-by-step walk of the triage workflow on the seed data. Every screen, button
and command below exists in the code; the ticket that asked for this script
(FIS-15) also asked for a "weight change" beat and a "mark as sent" beat, and
neither exists (ADR 0007: weights are a constant; FIS-10: drafts end at
`approved`), so they are not in the script.

## Before recording

```sh
pnpm install
pnpm --filter @fis/api seed        # 18 requests across five overlapping topics
pnpm dev                           # API on :3001, web on :3000
```

Open `http://localhost:3000`, turn **PM mode** on in the header and type a name in
"Acting as"; that name is sent as `decidedBy` / `updatedBy` on every decision.

Decide up front which path to record and say which one on camera:

- **Heuristic path** (no `ANTHROPIC_API_KEY`): deterministic, no network, every
  badge reads `Rule-based (heuristic)`.
- **Anthropic path** (`ANTHROPIC_API_KEY=sk-... pnpm --filter @fis/api dev`): the
  header badge reads `AI - anthropic`; artefact badges add the model id, for
  example `AI - anthropic claude-sonnet-5-5`. This path has not been run live from
  this repository; rehearse it before recording. Each AI call counts against
  `AI_DAILY_CALL_BUDGET` (default 500 per process per day), and the submit and AI
  endpoints are limited to 20 requests per minute per IP by default.

## Beats

| Time | Beat | What to show and say |
|---|---|---|
| 0:00 | Overview | The problem in one sentence: triage and decision-making on unstructured requests. The three success metrics (README, "Success metrics"). Point at the header: provider badge from `GET /health`, PM mode switch |
| 0:40 | Features | Discover (`/`): search, status and theme filters, sort by priority, vote. Themes page (`/themes`) empty or populated. Triage page (`/triage`): ranked queue with provider badges. Thirty seconds, no clicking into detail yet |
| 1:20 | AI live demo: submit a near-duplicate | `/submit`: title "Let us log in with Okta", a two-sentence description, an author name. Submit. "These look similar" lists "SSO via Okta" and "Okta login" with similarity and rationale; read the rationale and the badge aloud. Click "Support this one instead": the vote goes to the existing request, yours stays submitted |
| 2:10 | Analyze | The underlying-need panel appears under the submit result (the web app calls `POST /intelligence/analyze/:id` automatically). Open "View your request": priority score, five-criterion breakdown, rationale, duplicate candidates, prompt version. Say that the total is computed by the app from the breakdown, not by the model |
| 2:40 | Cluster | Themes page, "Re-cluster". Identity, reporting, notifications, integrations, mobile themes appear with summaries and member lists. Say: clustering groups, it never changes a status |
| 3:05 | Merge | Back on the request detail page of your Okta request, in PM mode: "Merge into" the existing "SSO via Okta" request with a one-line note and the confirmation checkbox. The source becomes `merged`, its votes move to the target, and a row is appended to `feature_request_decisions`. Say: there is no unmerge; a person decided this |
| 3:25 | Brief, approve, draft | On a theme card (or the top triage item): "Generate decision brief". Read recommendation, evidence, risks, open questions. Approve with a one-line note. "Draft update for requesters": edit a sentence, mark approved. Say: nothing was sent; the system drafts, a person sends. An approved draft can no longer be edited (409) |
| 3:55 | Architecture and tradeoffs | The mermaid diagram from the README. Port, two adapters, one side-effect-free tool per call, zod validation with one corrective retry, request text as escaped data, scores computed app-side, provider label everywhere. SQLite default; no auth; per-IP rate limit and a daily AI call budget, both in-process memory; Anthropic path not yet run live; three near-miss violations in the eval |
| 4:30 | AI in development | PRD, tickets, ADRs, spec, frozen contracts, parallel agents with disjoint scopes, `prompts.txt`, the security review (`docs/security-review.md`). Then `pnpm --filter @fis/api eval` in a terminal: show `apps/api/evals/RESULTS.md`, including the two failing dedupe cases |
| 4:55 | Close | What you would do next with production data: measure the three metrics, run `pnpm --filter @fis/api eval:anthropic`, add authentication before any exposure beyond a trusted network |

## Commands used

| Command | Source |
|---|---|
| `pnpm install` | root `package.json` |
| `pnpm --filter @fis/api seed` | `apps/api/package.json` (`nest build && node dist/database/seed/seed.js`) |
| `pnpm dev` | root `package.json` (`pnpm --filter @fis/shared build && pnpm -r --parallel dev`) |
| `pnpm --filter @fis/api eval` | `apps/api/package.json`, heuristic golden set, offline |
| `pnpm --filter @fis/api eval:anthropic` | `apps/api/package.json`, requires `ANTHROPIC_API_KEY` |
