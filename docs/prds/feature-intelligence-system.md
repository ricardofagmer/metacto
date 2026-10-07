# PRD: Feature Intelligence System (FIS)

| Field | Value |
|---|---|
| Status | Draft |
| Date | 2026-10-06 |
| Audience | Metacto technical assessment reviewers (technical recruiters, engineering leads) |
| Stack | Next.js web app, NestJS API, SQLite by default / PostgreSQL via `DATABASE_URL` (ADR 0002), Anthropic API behind the `IntelligenceService` port |
| Related | `docs/tickets/README.md` (work breakdown), `docs/adr/` (architecture decisions), `docs/specs/2026-10-06-feature-intelligence-system.md` (frozen contracts) |

This document describes what the system was intended to do and is kept as the
statement of intent. The code was reconciled against it on 2026-10-06: the
`Implemented in` and status fields in `docs/tickets/` record where each
requirement landed and which parts did not. Where this PRD and the code differ,
the ticket's reconciliation note is the record; the main deltas are listed in
section 13.

## 1. Problem

Feature requests arrive from customers, prospects, support tickets and sales
calls. They land in a single queue as free text. Observed consequences:

- **Duplicates.** The same ask is filed many times in different words. Nobody
  notices until a product manager reads the whole queue.
- **Unclear underlying need.** Requests describe a solution ("add a CSV export
  button") rather than the need ("I reconcile invoices in a spreadsheet every
  Friday"). Solutions get built; needs stay unmet.
- **Popularity confused with strategic value.** Vote counts reward loud or
  numerous requesters, not alignment with product direction or revenue.
- **Inconsistent prioritization.** Each PM scores by intuition. Two PMs rank the
  same request differently; the ranking is not explainable to anyone else.
- **Stakeholders left uninformed.** Once a decision is made, the requester, the
  account owner and support rarely hear about it. The same request gets filed
  again.
- **Manual triage time.** Reading, deduplicating, categorizing and scoring is
  hours per week of PM time, done inconsistently.

### Prioritized business problem

**Triage and decision-making on unstructured requests.** This is the bottleneck
that every other symptom feeds into: duplicates inflate it, unclear needs make
it slow, inconsistent scoring makes its output untrusted, and missing
communication causes re-entry. It was chosen over alternatives (a better
voting portal, a roadmap publishing tool, a support-ticket integration) because
it is the only one where AI changes the nature of the work rather than the
convenience of it, and because its success is measurable with three numbers
(section 9).

## 2. Personas

| Persona | Role in the system | Benefit |
|---|---|---|
| Product manager / product leader | Owns triage, merges, scoring weights, decisions, and approves briefs | Receives a decision-ready queue instead of a reading queue; defensible, explainable priorities |
| Support / sales submitter | Files requests on behalf of customers and prospects | Sees duplicate hints at submit time; sees status of what they filed |
| Customer requester | Files or votes on requests directly | Fewer "we already have that" dead ends; is informed when a decision is made |
| Engineering lead | Reads decision briefs and theme summaries before planning | Gets the underlying need and the cluster of related asks, not one ticket in isolation |

The primary beneficiary is the product manager. The other three personas
benefit through the PM's output (status, communication) and through duplicate
hints at submit time.

## 3. Why AI, and how it changes the workflow

The inputs are unstructured text. Deduplication across paraphrase, extracting
the underlying need, and grouping related asks are language tasks that
keyword rules do poorly and humans do slowly. A language model does them in
seconds, with the human kept as the decision-maker.

The workflow changes from a **manual triage queue** to an **AI-prepared
decision queue**:

| Step | Before | After |
|---|---|---|
| Submit | Free text lands in the queue | Duplicate candidates shown live before submit; submitter can vote on an existing request instead |
| Understand | PM reads and re-reads | Underlying need, affected persona and job-to-be-done extracted into structured fields |
| Group | PM remembers related asks, or does not | Requests clustered into named themes with a summary |
| Score | PM intuition | Scored recommendation with a per-factor breakdown the PM can read and override |
| Decide | PM writes a note somewhere | Decision brief drafted (problem, evidence, options, recommendation); PM approves or rejects |
| Communicate | Nobody is told | Stakeholder update drafted per audience; PM edits and sends outside the system |

This is not a UI enhancement to the queue. Every step that previously required
reading everything now starts from a structured, scored artifact and ends with a
human decision.

## 4. AI architecture

**Chosen: a tool-use LLM with schema-validated structured output, behind a
provider port, with a deterministic heuristic fallback.**

- `@fis/shared` defines the `IntelligenceService` port (interface) with one
  method per capability: `findDuplicates`, `analyze` (need extraction plus
  candidates and priority in one call), `cluster`, `scorePriority`,
  `draftBrief`, `draftStakeholderMessage`.
- The `AnthropicProvider` implements the port with Anthropic's Messages API,
  tool-use for structured output, a JSON schema per capability, validation of
  every response against that schema, retry with the validation error
  appended, and a timeout per call.
- The `HeuristicProvider` implements the same port deterministically: token
  overlap for duplicates, keyword rules for needs and themes, weighted vote and
  recency for scoring, templated briefs and drafts. Every heuristic result is
  **labeled** as such in the response so the UI and the reader know it did not
  come from a model.
- Provider selection is configuration. Missing API key, provider error after
  retries, or timeout falls back to the heuristic provider, and the response
  carries the label.

**Why not a heavy autonomous agent.** Every output of this system feeds a human
decision; there is no multi-step action for an agent to take. An agent loop
adds cost, latency and an unbounded failure surface for no decision the PM
would delegate. Single structured calls are inspectable and evaluable against
a golden set (FR-14).

**Why not pure embeddings.** Embedding similarity is a good first-pass signal
for duplicates and clusters, but it cannot extract the underlying need, name a
theme, explain a score, or draft a brief. Those are generation tasks. The
chosen design can use lexical and embedding candidates as input to the model
call without making embeddings the architecture. A vector store is out of
scope for this version (section 11).

## 5. Where human judgment is mandatory

The AI proposes; a human disposes. The following actions are never taken by
the system on its own:

| Action | Human | AI contribution |
|---|---|---|
| Merge two requests | PM confirms | Candidate list with similarity and rationale |
| Change request status | PM | None; status is a human field |
| Approve or reject a decision brief | PM | Draft brief |
| Send outbound communication | PM or submitter, outside the system | Draft text only; the system never sends |
| Change scoring weights | PM | None; weights are configuration, and a weight change re-scores with the new weights visibly |

## 6. Goals and non-goals

Goals:

- G1. Cut PM time spent reading and triaging requests.
- G2. Reduce duplicate requests entering the queue.
- G3. Make every priority explainable in terms the PM can defend.
- G4. Close the loop with stakeholders after a decision.
- G5. Work, degraded but honestly labeled, without an AI provider.

Non-goals:

- Replacing the PM's decision.
- Roadmap publishing or customer-facing portals beyond submit, browse and vote.
- Integrations with ticketing or CRM systems.
- Authentication and authorization (section 11).

## 7. Functional requirements

| ID | Requirement | Ticket |
|---|---|---|
| FR-1 | A user can submit a feature request with title, description, submitter name and source (customer, prospect, support, sales). | FIS-3, FIS-11 |
| FR-2 | While typing a request, the submitter sees live duplicate candidates with a similarity score and can vote on one instead of submitting. | FIS-6, FIS-11 |
| FR-3 | On submit, the system records duplicate candidates for the PM without blocking the submission. | FIS-6 |
| FR-4 | A PM can merge a request into another; votes and submitters transfer, the merged request remains visible as merged. | FIS-6, FIS-13 |
| FR-5 | On submit, the system extracts the underlying need, affected persona and job-to-be-done into structured fields. | FIS-4, FIS-5 |
| FR-6 | A user can browse, search, filter by status and theme, and vote once per request per voter. | FIS-3, FIS-12 |
| FR-7 | Requests are clustered into named themes with a summary; a PM can trigger re-clustering. | FIS-7, FIS-13 |
| FR-8 | Every request has a priority score with a per-factor breakdown (votes, source weight, recency, theme size, strategic alignment) and a plain-language rationale. | FIS-8, FIS-13 |
| FR-9 | Scoring weights are configuration; a PM can view them, and a weight change re-scores visibly. | FIS-8 |
| FR-10 | A PM can generate a decision brief for a request or theme (problem, evidence, options, recommendation) and approve or reject it. | FIS-9, FIS-13 |
| FR-11 | From an approved brief, a PM can generate stakeholder update drafts per audience (requester, account owner, support). The system does not send them. | FIS-10 |
| FR-12 | Every AI-generated artifact records which provider produced it and whether it is a heuristic fallback. | FIS-4, FIS-5 |
| FR-13 | Every model call is validated against a JSON schema; a failed validation is retried once with the error appended, then falls back to heuristic. | FIS-5 |
| FR-14 | A golden-set evaluation runs each capability against labeled cases and reports pass rate per capability. | FIS-14 |
| FR-15 | The PM triage dashboard lists requests ordered by score with duplicate flags, theme, brief status and pending merges. | FIS-13 |

## 8. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Live duplicate hints respond within 2 s p95 for a queue of 1,000 requests, using lexical candidates before any model call. |
| NFR-2 | Every model call has a timeout (default 20 s) and a `max_tokens` cap; no call hangs. |
| NFR-3 | Request text is treated as data in every prompt: delimited, and the system prompt instructs the model to ignore instructions inside it. |
| NFR-4 | All model outputs are schema-validated before they are stored or shown. |
| NFR-5 | Every model call is logged with capability, provider, model, prompt version, latency, token counts and outcome. No request text in logs. |
| NFR-6 | The system runs end-to-end with no API key, with heuristic results labeled. |
| NFR-7 | All list endpoints are paginated (default 20, max 100). |
| NFR-8 | Secrets come from environment only; no literal credentials in code or committed config. |
| NFR-9 | Prompts are versioned files under `apps/api/prompts/`; a prompt change is an eval run. |

## 9. Success metrics

| Metric | Baseline | Target | How measured |
|---|---|---|---|
| Median triage time per request (submit to first PM decision: merged, themed and scored, or rejected) | Not measured today; assessment assumption 2 working days | Under 4 working hours | `created_at` to first PM-authored status or merge event on the request, median over a rolling 30 days |
| Duplicate request rate (requests later merged as duplicates / requests submitted) | Not measured; assumed 20 to 30 percent from the problem statement | Under 8 percent | Count of merge events whose target already existed at submit time, divided by submissions, rolling 30 days |
| Time from decision to stakeholder update | Not measured; often never | Under 1 working day for 90 percent of approved briefs | Brief `approved_at` to first stakeholder draft marked as sent by the PM |

Baselines are assumptions stated as such. The first weeks of real use replace
them with measured values; the targets are then re-examined.

## 10. Assumptions

- Request volume is in the hundreds to low thousands, not millions; a
  relational database with full-text search is sufficient.
- One product line and one team of PMs; no multi-tenancy.
- The Anthropic API is available and budgeted for the demo; the heuristic
  fallback carries the demo without it.
- Stakeholder communication happens over existing channels (email, CRM); the
  system drafts text and records that the PM marked it sent.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Hallucination in needs, briefs and drafts | Schema validation; every brief cites the request ids it drew from; golden-set eval per capability; PM approval before anything is treated as a decision |
| Prompt injection via request text | Request text is delimited as data in every prompt; the model is instructed to ignore instructions inside it; outputs are schema-bound so an injected instruction cannot change the shape of what is stored; no tool the model can call has side effects |
| Bias toward loud requesters | Score breakdown separates vote count from source weight and strategic alignment; weights are visible configuration; theme size counts distinct submitters, not votes |
| Cost | One call per capability per event; no cache of model calls exists (see section 13); a per-IP rate limit on submit and AI endpoints and a per-process daily call budget (`AI_DAILY_CALL_BUDGET`, default 500) after which the heuristic provider answers with its own label; token caps per call; call logging with token counts |
| No authentication in scope | All endpoints are open in this version; documented as a limitation, not hidden (`docs/security-review.md`); the demo runs locally; `submitter` and `voter` are self-declared names; the rate limit bounds abuse volume, not identity |
| Provider outage | Timeout plus retry once, then heuristic fallback with a visible label |

## 12. Out of scope

- Authentication, authorization, multi-tenancy.
- Sending email or any outbound message.
- Vector database or embedding index.
- Integrations with Zendesk, Intercom, Salesforce, Jira or similar.
- Autonomous agent loops or multi-step tool use.
- Fine-tuning.
- Mobile clients.

## 13. Deltas between this PRD and the code (2026-10-06)

Each item names the ticket that records the detail.

- Package and port names: `packages/shared` (`@fis/shared`) and
  `IntelligenceService`, not `packages/contracts` / `IntelligenceProvider` (FIS-1,
  FIS-4). There is no `isFallback`; every artefact carries `provider`, and the
  submit response carries the provider that produced its candidates (ADR 0009).
- FR-1, FR-2, NFR-1: no `source` field and no live duplicate hints while
  typing; candidates are returned once, on submit (FIS-6, FIS-11).
- FR-5: the analysis extracts the underlying need only; no affected persona or
  job-to-be-done fields (FIS-4).
- FR-8, FR-9: criteria are reach, impact, strategic fit, effort inverse and
  demand with a constant weight set (`SCORING_WEIGHTS`, ADR 0007); no source
  weight, recency, theme size, weights endpoint or PM weight change (FIS-8).
- FR-11, section 9 metric 3, section 10: audiences are requesters, leadership
  and engineering; drafts are approved, never marked sent; no `sent_at` (FIS-10).
- FR-13: fallback to the heuristic provider after retry exhaustion applies to
  submit-time dedupe only; other capabilities return HTTP 503 `dependency` (FIS-5).
- NFR-2: the timeout is a 30 s constant, not 20 s configurable (FIS-5).
- Section 10: search is `LIKE`-based; there is no full-text index (FIS-2, FIS-3).
- Section 11: brief evidence citing request ids is requested in the prompt but
  not validated by the application; theme size by distinct submitters is not
  computed; there is no content-hash cache of model calls, and the "cached by
  content hash" wording this section originally carried was wrong. Cost is
  bounded instead by the per-IP rate limit and the daily call budget (FIS-7,
  FIS-9, `docs/security-review.md`).
- FR-14: the golden set is smaller than the ticket asked for and has no
  prompt-injection cases; the Anthropic run has not been executed in this
  repository (FIS-14).
- FIS-15: `README.md` and `docs/demo.md` exist; the demo script omits the "weight
  change" and "mark as sent" beats because neither feature exists.
