import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const Ratio = z.number().min(0).max(1).nullable();
const Count = z.object({ passed: z.number().int().min(0), total: z.number().int().min(0) });

// One summary row per eval run, so pass rates can be tracked over prompt, threshold and golden-set
// changes. Rows are appended by evals/run.ts and never edited.
export const HistoryEntry = z.object({
  date: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1).nullable(),
  goldenVersion: z.string().min(1),
  versions: z.array(z.string().min(1)),
  dedupePrecision: Ratio,
  dedupeRecall: Ratio,
  dedupeCases: Count,
  nearMissViolations: z.number().int().min(0),
  separationChecks: Count,
  scoringBands: Count,
  scoringOrderings: Count,
  needScorer: z.string().min(1),
  need: Count,
  clusterTogether: Count,
  clusterApart: Count,
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;

const History = z.array(HistoryEntry);

const HISTORY_FILE = join(__dirname, 'history.json');

export function loadHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }
  const raw: unknown = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
  return History.parse(raw);
}

export function saveHistory(entries: HistoryEntry[]): void {
  writeFileSync(HISTORY_FILE, `${JSON.stringify(History.parse(entries), null, 2)}\n`);
}
