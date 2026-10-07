import 'reflect-metadata';
import { DataSource, EntityManager, In } from 'typeorm';
import { FeatureRequestStatus } from '@fis/shared';
import { appLogger } from '../../common/json-logger';
import { loadEnv } from '../../config/env.service';
import { buildDataSourceOptions } from '../data-source-options';
import { FeatureRequestEntity, VoteEntity } from '../entities';
import {
  SEED_BASE_TIME,
  SEED_INTERVAL_MS,
  SEED_REQUESTS,
  SEED_VOTER_POOL_SIZE,
  SeedRequest,
  seedRequestId,
  seedVoteId,
  seedVoterKey,
} from './seed-data';

function seedTimestamp(key: number): string {
  return new Date(SEED_BASE_TIME + key * SEED_INTERVAL_MS).toISOString();
}

function toRequestEntity(seed: SeedRequest): FeatureRequestEntity {
  const entity = new FeatureRequestEntity();
  entity.id = seedRequestId(seed.key);
  entity.title = seed.title;
  entity.description = seed.description;
  entity.authorName = seed.authorName;
  entity.status = FeatureRequestStatus.enum.open;
  entity.mergedIntoId = null;
  entity.themeId = null;
  entity.voteCount = 0;
  entity.decidedBy = null;
  entity.decidedAt = null;
  entity.decisionNote = null;
  entity.createdAt = seedTimestamp(seed.key);
  entity.updatedAt = entity.createdAt;
  return entity;
}

// Voters are drawn from a shared pool so the same people vote across related requests, as in real usage.
function toVoteEntities(seed: SeedRequest): VoteEntity[] {
  return Array.from({ length: Math.min(seed.voters, SEED_VOTER_POOL_SIZE) }, (_, index) => {
    const voterIndex = ((seed.key + index) % SEED_VOTER_POOL_SIZE) + 1;
    const vote = new VoteEntity();
    vote.id = seedVoteId(seed.key, voterIndex);
    vote.featureRequestId = seedRequestId(seed.key);
    vote.voterKey = seedVoterKey(voterIndex);
    vote.createdAt = seedTimestamp(seed.key);
    return vote;
  });
}

async function seedCorpus(manager: EntityManager): Promise<number> {
  const requests = SEED_REQUESTS.map(toRequestEntity);
  const existing = await manager.getRepository(FeatureRequestEntity).find({
    select: { id: true },
    where: { id: In(requests.map((request) => request.id)) },
  });
  const existingIds = new Set(existing.map((request) => request.id));
  const missing = requests.filter((request) => !existingIds.has(request.id));
  const missingSeeds = SEED_REQUESTS.filter((seed) => !existingIds.has(seedRequestId(seed.key)));

  // Rows that already exist are left untouched, so demo decisions (merges, status changes) survive a re-seed.
  if (missing.length > 0) {
    await manager.getRepository(FeatureRequestEntity).insert(missing);
  }
  for (const seed of missingSeeds) {
    const votes = toVoteEntities(seed);
    await manager.getRepository(VoteEntity).insert(votes);
    await manager.getRepository(FeatureRequestEntity).update({ id: seedRequestId(seed.key) }, { voteCount: votes.length });
  }
  return missing.length;
}

async function runSeed(): Promise<void> {
  const env = loadEnv();
  const dataSource = new DataSource(buildDataSourceOptions(env.DATABASE_URL));
  await dataSource.initialize();
  try {
    const inserted = await dataSource.transaction(seedCorpus);
    appLogger.event('info', 'seed.completed', { inserted, skipped: SEED_REQUESTS.length - inserted });
  } finally {
    await dataSource.destroy();
  }
}

runSeed().catch((error: unknown) => {
  appLogger.event('error', 'seed.failed', {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
