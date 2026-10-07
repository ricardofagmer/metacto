import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';
import { InitialSchema1759780000000 } from './migrations/1759780000000-initial-schema';
import { FeatureRequestDecisions1759790000000 } from './migrations/1759790000000-feature-request-decisions';
import { RelabelLegacyProvider1759800000000 } from './migrations/1759800000000-relabel-legacy-provider';

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\//;
const MIGRATIONS = [InitialSchema1759780000000, FeatureRequestDecisions1759790000000, RelabelLegacyProvider1759800000000];

// DATABASE_URL selects the driver (ADR 0002); synchronize stays off so migrations are the only schema path.
export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  if (POSTGRES_URL_PATTERN.test(databaseUrl)) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: ENTITIES,
      migrations: MIGRATIONS,
      migrationsRun: true,
      synchronize: false,
    };
  }
  const databasePath = resolve(databaseUrl);
  // better-sqlite3 creates the file but not its directory; a fresh clone has no ./data yet.
  mkdirSync(dirname(databasePath), { recursive: true });
  return {
    type: 'better-sqlite3',
    database: databasePath,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsRun: true,
    synchronize: false,
  };
}
