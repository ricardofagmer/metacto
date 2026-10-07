import { ACTOR_NAME_MAX_LENGTH } from '@fis/shared';
import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from '@/lib/browser-storage';

const PM_MODE_STORAGE_KEY = 'fis.pmMode';

export type PmMode = { enabled: boolean; actingAs: string };

const DEFAULT_PM_MODE: PmMode = { enabled: false, actingAs: '' };

// UI-only role switch per ADR 0005; the API does not check it.
let current: PmMode = DEFAULT_PM_MODE;
let loaded = false;
const listeners = new Set<() => void>();

function parseStored(raw: string | null): PmMode {
  if (raw === null) return DEFAULT_PM_MODE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PM_MODE;
    const enabled = 'enabled' in parsed && parsed.enabled === true;
    const actingAs = 'actingAs' in parsed && typeof parsed.actingAs === 'string' ? parsed.actingAs.slice(0, ACTOR_NAME_MAX_LENGTH) : '';
    return { enabled, actingAs };
  } catch {
    return DEFAULT_PM_MODE;
  }
}

function getSnapshot(): PmMode {
  if (!loaded) {
    current = parseStored(readStorage(PM_MODE_STORAGE_KEY));
    loaded = true;
  }
  return current;
}

function getServerSnapshot(): PmMode {
  return DEFAULT_PM_MODE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updatePmMode(patch: Partial<PmMode>): void {
  current = { ...getSnapshot(), ...patch };
  writeStorage(PM_MODE_STORAGE_KEY, JSON.stringify(current));
  listeners.forEach((listener) => listener());
}

export function usePmMode(): PmMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// The trimmed display name sent as decidedBy / updatedBy, or null when PM mode cannot act.
export function useActingAs(): string | null {
  const mode = usePmMode();
  const name = mode.actingAs.trim();
  return mode.enabled && name !== '' ? name : null;
}
