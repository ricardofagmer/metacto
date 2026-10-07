'use client';

import type { Provider } from '@fis/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clusterThemes, type ApiFailure } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InlineFailure } from '@/components/ui/inline-failure';
import { providerLabel } from '@/components/ui/provenance';

type Outcome = { themeCount: number; provider: Provider };

export function ReclusterButton() {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function recluster(): void {
    setFailure(null);
    setOutcome(null);
    startTransition(async () => {
      const result = await clusterThemes();
      if (!result.ok) {
        setFailure(result.error);
        return;
      }
      setOutcome({ themeCount: result.data.themes.length, provider: result.data.provider });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button pending={pending} pendingLabel="Clustering..." onClick={recluster}>
        Re-cluster with AI
      </Button>
      <div aria-live="polite" className="text-right">
        {outcome !== null ? (
          <p className="text-xs text-success">
            {outcome.themeCount} {outcome.themeCount === 1 ? 'theme' : 'themes'} produced by {providerLabel({ provider: outcome.provider })}.
          </p>
        ) : null}
        {failure !== null ? <InlineFailure failure={failure} prefix="Clustering failed." /> : null}
      </div>
    </div>
  );
}
