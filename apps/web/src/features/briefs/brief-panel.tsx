'use client';

import type { BriefSubject, DecisionBrief } from '@fis/shared';
import { useState, useTransition } from 'react';
import { createBrief, type ApiFailure } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InlineFailure } from '@/components/ui/inline-failure';
import { BriefCard } from './brief-card';
import type { StoredBrief } from './load-briefs';

type BriefPanelProps = { subject: BriefSubject; stored: StoredBrief; label?: string };

// Seeded from the server read-back; later actions update local state without a full page reload.
export function BriefPanel({ subject, stored, label = 'Generate decision brief' }: BriefPanelProps) {
  const [brief, setBrief] = useState<DecisionBrief | null>(stored.brief);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();
  // Initial drafts belong to the stored brief only; a freshly generated brief starts with none.
  const initialDrafts = brief?.id === stored.brief?.id ? stored.drafts : [];
  const draftsFailure = brief?.id === stored.brief?.id ? stored.draftsFailure : null;

  function generate(): void {
    setFailure(null);
    startTransition(async () => {
      const result = await createBrief(subject);
      if (result.ok) setBrief(result.data);
      else setFailure(result.error);
    });
  }

  const canGenerate = brief === null || brief.status === 'rejected';

  return (
    <div className="space-y-3">
      {stored.briefFailure !== null && brief === null ? (
        <InlineFailure failure={stored.briefFailure} prefix="Earlier briefs could not be loaded." />
      ) : null}
      {brief !== null ? (
        <BriefCard key={brief.id} brief={brief} initialDrafts={initialDrafts} draftsFailure={draftsFailure} onChange={setBrief} />
      ) : null}
      {canGenerate ? (
        <div className="space-y-2" aria-live="polite">
          <Button variant="secondary" pending={pending} pendingLabel="Drafting brief..." onClick={generate}>
            {brief === null ? label : 'Generate a new brief'}
          </Button>
          {failure !== null ? <InlineFailure failure={failure} prefix="Brief not generated." /> : null}
        </div>
      ) : null}
    </div>
  );
}
