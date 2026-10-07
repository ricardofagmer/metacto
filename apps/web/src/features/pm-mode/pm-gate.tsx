'use client';

import type { ReactNode } from 'react';
import { usePmMode } from './pm-mode-store';

type PmGateProps = {
  // Rendered with the trimmed acting-as name once PM mode is on and a name is set.
  children: (actingAs: string) => ReactNode;
  // Shown when PM mode is off; omit to render nothing.
  offFallback?: ReactNode;
};

export function PmGate({ children, offFallback }: PmGateProps) {
  const mode = usePmMode();
  if (!mode.enabled) return offFallback ?? null;
  const actingAs = mode.actingAs.trim();
  if (actingAs === '') {
    return (
      <p role="note" className="rounded-lg border border-warning bg-warning-soft p-3 text-sm text-fg">
        Enter your name in the header &quot;Acting as&quot; field. Decisions are recorded under that name.
      </p>
    );
  }
  return <>{children(actingAs)}</>;
}
