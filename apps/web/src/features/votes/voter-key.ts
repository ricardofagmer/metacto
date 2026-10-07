import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from '@/lib/browser-storage';

const VOTER_KEY_STORAGE_KEY = 'fis.voterKey';
const VOTED_IDS_STORAGE_KEY = 'fis.votedRequestIds';
const VOTER_KEY_BYTES = 16;
const VOTER_KEY_PATTERN = /^[0-9a-f]{32}$/;

// Fallback when storage is unavailable: the key lives for this page session only.
let sessionVoterKey: string | null = null;

function generateVoterKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(VOTER_KEY_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Anonymous id per ADR 0005: random 32-hex string, not a credential.
export function getVoterKey(): string {
  const stored = readStorage(VOTER_KEY_STORAGE_KEY);
  if (stored !== null && VOTER_KEY_PATTERN.test(stored)) return stored;
  if (sessionVoterKey !== null) return sessionVoterKey;
  const created = generateVoterKey();
  sessionVoterKey = created;
  writeStorage(VOTER_KEY_STORAGE_KEY, created);
  return created;
}

function readVotedIds(): string[] {
  const raw = readStorage(VOTED_IDS_STORAGE_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

const votedListeners = new Set<() => void>();

function subscribeVoted(listener: () => void): () => void {
  votedListeners.add(listener);
  return () => votedListeners.delete(listener);
}

// Local memory of this browser's votes; the API has no "did I vote" read, so this only drives the pressed state.
export function rememberVote(requestId: string, voted: boolean): void {
  const others = readVotedIds().filter((id) => id !== requestId);
  writeStorage(VOTED_IDS_STORAGE_KEY, JSON.stringify(voted ? [...others, requestId] : others));
  votedListeners.forEach((listener) => listener());
}

export function useHasVoted(requestId: string): boolean {
  return useSyncExternalStore(
    subscribeVoted,
    () => readVotedIds().includes(requestId),
    () => false,
  );
}
