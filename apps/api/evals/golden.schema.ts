import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { Id, PRIORITY_MAX, PRIORITY_MIN, RequestSummary } from '@fis/shared';

const IdPair = z.tuple([Id, Id]);

export const GoldenSet = z.object({
  version: z.string().min(1),
  createdAt: z.string().min(1),
  notes: z.string(),
  corpus: z.array(RequestSummary).min(2),
  dedupe: z.array(
    z.object({
      name: z.string().min(1),
      queryId: Id,
      expectedDuplicates: z.array(Id),
      mustNotMatch: z.array(Id),
    }),
  ),
  scoring: z.object({
    maxVoteCount: z.number().int().min(0),
    corpusSize: z.number().int().min(0),
    cases: z.array(
      z.object({
        name: z.string().min(1),
        requestId: Id,
        underlyingNeed: z.string().min(1),
        expectedBand: z.tuple([z.number().min(PRIORITY_MIN), z.number().max(PRIORITY_MAX)]),
      }),
    ),
    // Each pair reads "first must score strictly higher than second".
    orderings: z.array(IdPair),
  }),
  need: z.array(
    z.object({
      name: z.string().min(1),
      requestId: Id,
      expectedKeywords: z.array(z.string().min(1)).min(1),
    }),
  ),
  cluster: z.object({
    together: z.array(IdPair),
    apart: z.array(IdPair),
  }),
});
export type GoldenSet = z.infer<typeof GoldenSet>;

export function loadGoldenSet(): GoldenSet {
  const raw: unknown = JSON.parse(readFileSync(join(__dirname, 'golden.json'), 'utf8'));
  return GoldenSet.parse(raw);
}

export function findRequest(golden: GoldenSet, id: string): RequestSummary {
  const request = golden.corpus.find((entry) => entry.id === id);
  if (request === undefined) {
    throw new Error(`golden set references unknown request ${id}`);
  }
  return request;
}
