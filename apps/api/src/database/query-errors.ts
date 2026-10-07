import { QueryFailedError } from 'typeorm';

const SQLITE_UNIQUE_CODE = 'SQLITE_CONSTRAINT_UNIQUE';
const POSTGRES_UNIQUE_CODE = '23505';

function hasCode(value: unknown): value is { code: unknown } {
  return typeof value === 'object' && value !== null && 'code' in value;
}

// Lets services turn a lost insert race on a unique constraint into a domain conflict on either driver.
export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError: unknown = error.driverError;
  if (!hasCode(driverError)) {
    return false;
  }
  return driverError.code === SQLITE_UNIQUE_CODE || driverError.code === POSTGRES_UNIQUE_CODE;
}
