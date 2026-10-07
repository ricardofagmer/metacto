'use client';

import type { FeatureRequestStatus } from '@fis/shared';
import { PmGate } from '@/features/pm-mode/pm-gate';
import { MergeForm } from './merge-form';
import type { MergeTarget } from './merge-target-search';
import { StatusForm } from './status-form';

type PmActionsProps = { requestId: string; status: FeatureRequestStatus; suggestions: MergeTarget[] };

export function PmActions({ requestId, status, suggestions }: PmActionsProps) {
  return (
    <PmGate
      offFallback={<p className="text-sm text-fg-muted">Turn on PM mode in the header to change status or merge this request.</p>}
    >
      {(actingAs) =>
        status === 'merged' ? (
          <p className="text-sm text-fg-muted">This request was merged. Its status can no longer change.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <StatusForm requestId={requestId} currentStatus={status} actingAs={actingAs} />
            <MergeForm requestId={requestId} suggestions={suggestions} actingAs={actingAs} />
          </div>
        )
      }
    </PmGate>
  );
}
