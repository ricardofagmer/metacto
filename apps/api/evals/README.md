# Golden-set evals

`run.ts` scores an `IntelligenceService` provider against `golden.json` and writes a report
plus one summary row to `history.json`.

| Command | Provider | Cost | Report |
|---|---|---|---|
| `tsx evals/run.ts --provider=heuristic` | in-process heuristic | free, offline | `RESULTS.md` |
| `pnpm --filter @fis/api eval:anthropic` | Anthropic adapter | about 20 model calls plus 2 judge calls | `RESULTS.anthropic.md` |

Run the eval after every prompt, threshold, rule, tokenizer or model change, and commit the
report and the new `history.json` row with the change.

## The Anthropic path is not verified in CI

This repository's CI has no `ANTHROPIC_API_KEY`, so the Anthropic adapter and the LLM judge have
been typechecked but **never run against the live API here**. `RESULTS.anthropic.md` does not
exist until someone runs it. Before trusting the Anthropic provider (or after changing any file in
`apps/api/prompts/`), run it locally:

```sh
ANTHROPIC_API_KEY=... pnpm --filter @fis/api eval:anthropic
# optional: ANTHROPIC_MODEL=<model id>  ANTHROPIC_JUDGE_MODEL=<model id>
```

The `eval:anthropic` script is owned by the API package (`apps/api/package.json`); it runs
`run.ts --provider=anthropic`. The key is read from the environment only and is never written to
a report.

## Scorers

- **findDuplicates**: precision and recall at the port default threshold (0.6), a threshold
  sweep, near-miss violations (a `mustNotMatch` pair returned at 0.6) and separation checks
  (duplicates >= 0.6, distinct pairs < 0.4).
- **scorePriority**: score inside the expected band, and rank agreement on ordered pairs.
- **analyze (underlying need)**: the heuristic is scored by keyword inclusion, because it quotes
  the requester verbatim. The Anthropic path is scored by an LLM judge (`need-judge.ts`,
  `need-judge@1`) on three criteria: grounded in the request, states the problem rather than the
  solution, covers the reference concepts in any wording. Missing keywords are still listed as a
  diagnostic. The judge defaults to the same model as the provider under test, which biases it
  toward that model's own phrasing; set `ANTHROPIC_JUDGE_MODEL` to a different model when that
  matters.
- **cluster**: duplicate pairs share a theme, unrelated pairs do not.

## Heuristic dedupe calibration

The port's threshold (default 0.6) is on the scale an LLM uses when judging "same need".
Bag-of-words TF-IDF cosine between two short, independently worded requests lives far lower:
on golden@1 every real duplicate scored 0.26-0.35, so the raw 0.6 cut had 0% recall. The
heuristic therefore maps its raw cosine onto the caller scale with a monotonic piecewise-linear
calibration anchored at `HEURISTIC_COSINE_AT_DEFAULT_THRESHOLD` (raw 0.267 = caller 0.6), in
`src/intelligence/providers/heuristic/heuristic-dedupe.ts`. Ranking is unchanged; only the
reported scale moves, so a caller threshold means the same thing for every provider.

Signal choice, swept on the golden@2 corpus before the anchor was fixed (raw scores; "gap" is the
weakest true duplicate minus the strongest labelled near miss on the golden@1 cases):

| Signal | Weakest duplicate | Strongest near miss | Gap |
|---|---|---|---|
| TF-IDF cosine, title weighted x2 (kept) | 0.271 | 0.263 | +0.008 |
| 0.7 cosine + 0.3 description Jaccard | 0.213 | 0.229 | -0.016 |
| 0.7 cosine + 0.3 title-token Jaccard | 0.233 | 0.284 | -0.051 |
| title-only TF-IDF cosine | 0.143 | 0.468 | -0.325 |
| cosine + stem-bigram Jaccard (any weight 0.5-3) | 0.271 | 0.263 | +0.008 |

Title overlap is exactly what same-topic near misses share ("Okta login" vs "Login with
Google"), so every title-based blend made separation worse; bigrams are too sparse in short
requests to move anything on golden@1. Plain cosine stayed. The gap is 0.008, which is thin:
treat the anchor as fitted to five positives, and re-sweep it whenever the tokenizer, the
synonym table or the golden set changes.

golden@2 appended four dedupe cases (requests 18-22) **before** the anchor was chosen, and
changed no golden@1 label. One of them is a hard near miss no lexical signal separates: "Reset
password by SMS" against the password-reset-email bug shares "reset", "password" and "email"
(raw cosine 0.32-0.34, above two real duplicates). It is left in the golden set as a known
heuristic limitation rather than tuned away; separating it needs the model path.
