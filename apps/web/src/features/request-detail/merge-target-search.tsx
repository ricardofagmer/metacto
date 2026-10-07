'use client';

import { SEARCH_QUERY_MAX_LENGTH } from '@fis/shared';
import { useState, useTransition } from 'react';
import { listFeatureRequests, type ApiFailure } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InlineFailure } from '@/components/ui/inline-failure';

export type MergeTarget = { id: string; title: string };

const SEARCH_LIMIT = 10;

type MergeTargetSearchProps = { excludeId: string; onResults: (targets: MergeTarget[]) => void };

// Explicit search on button press, not on keystroke, to keep the API quiet.
export function MergeTargetSearch({ excludeId, onResults }: MergeTargetSearchProps) {
  const [query, setQuery] = useState('');
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function search(): void {
    const q = query.trim();
    if (q === '') return;
    setFailure(null);
    startTransition(async () => {
      const result = await listFeatureRequests({ q, limit: SEARCH_LIMIT, sort: 'votes' });
      if (!result.ok) {
        setFailure(result.error);
        return;
      }
      onResults(
        result.data.items
          .filter((item) => item.id !== excludeId && item.status !== 'merged')
          .map((item) => ({ id: item.id, title: item.title })),
      );
    });
  }

  return (
    <div className="space-y-2">
      <label htmlFor="merge-search" className="block text-sm font-medium text-fg">
        Find another target
      </label>
      <div className="flex gap-2">
        <input
          id="merge-search"
          type="search"
          value={query}
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              search();
            }
          }}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
        />
        <Button variant="secondary" pending={pending} pendingLabel="Searching..." onClick={search}>
          Search
        </Button>
      </div>
      {failure !== null ? <InlineFailure failure={failure} prefix="Search failed." /> : null}
    </div>
  );
}
