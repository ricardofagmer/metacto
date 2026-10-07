import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { IntelligenceService } from '@fis/shared';
import { PROMPT_VERSIONS } from '../src/intelligence/prompts/prompt-versions';
import { AnthropicProvider } from '../src/intelligence/providers/anthropic/anthropic.provider';
import { HeuristicProvider } from '../src/intelligence/providers/heuristic/heuristic.provider';
import { HEURISTIC_VERSIONS } from '../src/intelligence/providers/heuristic/heuristic-versions';
import { loadGoldenSet } from './golden.schema';
import { loadHistory, saveHistory } from './history';
import { NEED_JUDGE_VERSION, NeedJudge, createNeedJudge } from './need-judge';
import { EvalRun, renderReport, summarizeRun } from './report';
import { evaluateCluster, evaluateDedupe, evaluateNeed, evaluateScoring } from './scorers';

/**
 * Golden-set runner: `tsx evals/run.ts --provider=heuristic|anthropic` (see evals/README.md).
 * The heuristic run is free and offline. The anthropic run spends real tokens (about 20 provider
 * calls plus 2 judge calls) and needs ANTHROPIC_API_KEY; ANTHROPIC_MODEL defaults to the API's
 * documented default and ANTHROPIC_JUDGE_MODEL to ANTHROPIC_MODEL.
 */
const DEFAULT_MODEL = 'claude-sonnet-5-5';
const ProviderFlag = z.enum(['heuristic', 'anthropic']);

// This script is its own entry point, so it validates its own environment like the API config layer does.
const ScriptEnv = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).default(DEFAULT_MODEL),
  ANTHROPIC_JUDGE_MODEL: z.string().min(1).optional(),
});

type ProviderSetup = { provider: IntelligenceService; model: string | null; versions: string[]; needJudge?: NeedJudge };

function parseProviderFlag(argv: string[]): z.infer<typeof ProviderFlag> {
  const flag = argv.find((argument) => argument.startsWith('--provider='));
  return ProviderFlag.parse(flag === undefined ? 'heuristic' : flag.slice('--provider='.length));
}

function buildProvider(kind: z.infer<typeof ProviderFlag>): ProviderSetup {
  if (kind === 'heuristic') {
    return { provider: new HeuristicProvider(), model: null, versions: Object.values(HEURISTIC_VERSIONS) };
  }
  const env = ScriptEnv.parse(process.env);
  if (env.ANTHROPIC_API_KEY === undefined) {
    throw new Error('--provider=anthropic needs ANTHROPIC_API_KEY');
  }
  return {
    provider: new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL }),
    model: env.ANTHROPIC_MODEL,
    versions: [...Object.values(PROMPT_VERSIONS), NEED_JUDGE_VERSION],
    // Only the model path is judged; the heuristic keeps keyword inclusion (see need-judge.ts).
    needJudge: createNeedJudge({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_JUDGE_MODEL ?? env.ANTHROPIC_MODEL }),
  };
}

async function main(): Promise<void> {
  const kind = parseProviderFlag(process.argv.slice(2));
  const golden = loadGoldenSet();
  const { provider, model, versions, needJudge } = buildProvider(kind);
  const startedAt = Date.now();
  const dedupe = await evaluateDedupe(provider, golden);
  const scoring = await evaluateScoring(provider, golden);
  const need = await evaluateNeed(provider, golden, needJudge);
  const cluster = await evaluateCluster(provider, golden);
  const run: EvalRun = {
    date: new Date().toISOString(),
    provider: provider.provider,
    model,
    goldenVersion: golden.version,
    promptVersions: versions,
    durationMs: Date.now() - startedAt,
    dedupe,
    scoring,
    need,
    cluster,
  };
  const history = [...loadHistory(), summarizeRun(run)];
  const report = renderReport(run, history);
  saveHistory(history);
  writeFileSync(join(__dirname, kind === 'heuristic' ? 'RESULTS.md' : 'RESULTS.anthropic.md'), report);
  process.stdout.write(report);
}

main().catch((error: unknown) => {
  process.stderr.write(`eval run failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
