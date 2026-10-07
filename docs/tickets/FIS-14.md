# FIS-14: AI golden-set evaluation

| Field | Value |
|---|---|
| Status | partial |
| Owner unit | ai module (wave 2) |
| Scope | `apps/api/evals/**` |
| Depends on | FIS-4, FIS-5 |
| Implemented in | `apps/api/evals/{golden.json,golden.schema.ts,scorers.ts,need-judge.ts,report.ts,history.ts,run.ts,README.md,RESULTS.md,history.json}`, `apps/api/package.json` (`eval`, `eval:gemini`) |

## Scope

Golden set `golden@2`: a labelled corpus, 12 dedupe cases (expected duplicates
and must-not-match pairs), 5 scoring cases with bands plus 5 orderings, 2
need-extraction cases, and cluster together/apart pairs. Runner
`tsx evals/run.ts --provider=heuristic|gemini` scores each capability and
writes `RESULTS.md` (heuristic) or `RESULTS.gemini.md` (Gemini) plus a
row in `history.json`. Need extraction is scored by keyword inclusion for the
heuristic and by an LLM judge (`need-judge@1`) for the Gemini run.
`evals/README.md` documents the scorers and the heuristic calibration sweep
(ADR 0008).

## Acceptance criteria

- [ ] At least 10 cases per capability with prompt-injection cases. Not met: 12 dedupe, 5 scoring, 2 need, 9 cluster pairs, no brief cases, no injection cases.
- [x] Exact checks for structured fields (precision/recall at 0.6, bands, orderings, theme membership); the free-text judge rule is documented (`need-judge.ts`, `evals/README.md`).
- [x] Runner works offline against the heuristic provider; the Gemini path requires `GEMINI_API_KEY` and has not been run in this repository (`RESULTS.gemini.md` does not exist).
- [x] Report lists pass rate per capability, prompt or heuristic versions and model; `RESULTS.md` and `history.json` are committed as the baseline.

## Dependencies

FIS-4, FIS-5.
