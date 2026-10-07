'use client';

import type { ReactNode } from 'react';
import { usePmMode } from './pm-mode-store';

type PmOnlyProps = { children: ReactNode; fallback: ReactNode };

// Accepts server-rendered children, unlike PmGate's render prop, so whole server sections can be gated.
export function PmOnly({ children, fallback }: PmOnlyProps) {
  const mode = usePmMode();
  return <>{mode.enabled ? children : fallback}</>;
}
