'use client';

import { Audience, type StakeholderDraft } from '@fis/shared';
import { useState, useTransition } from 'react';
import { createStakeholderDraft, type ApiFailure } from '@/lib/api';
import { AUDIENCE_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { InlineFailure } from '@/components/ui/inline-failure';
import { DraftEditor } from './draft-editor';

type StakeholderDraftsProps = {
  briefId: string;
  actingAs: string;
  initialDrafts: StakeholderDraft[];
  loadFailure: ApiFailure | null;
};

function byAudience(drafts: StakeholderDraft[]): Partial<Record<Audience, StakeholderDraft>> {
  return Object.fromEntries(drafts.map((draft) => [draft.audience, draft]));
}

export function StakeholderDrafts({ briefId, actingAs, initialDrafts, loadFailure }: StakeholderDraftsProps) {
  const [drafts, setDrafts] = useState(() => byAudience(initialDrafts));

  function storeDraft(draft: StakeholderDraft): void {
    setDrafts((previous) => ({ ...previous, [draft.audience]: draft }));
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-fg">Stakeholder updates</h4>
      <p className="text-xs text-fg-muted">Drafts are written by the engine and sent by nobody until a person edits and approves them.</p>
      {loadFailure !== null ? <InlineFailure failure={loadFailure} prefix="Earlier drafts could not be loaded." /> : null}
      {Audience.options.map((audience) => {
        const draft = drafts[audience];
        return draft !== undefined ? (
          <DraftEditor key={audience} draft={draft} actingAs={actingAs} onChange={storeDraft} />
        ) : (
          <DraftGenerator key={audience} briefId={briefId} audience={audience} onCreated={storeDraft} />
        );
      })}
    </div>
  );
}

type DraftGeneratorProps = { briefId: string; audience: Audience; onCreated: (draft: StakeholderDraft) => void };

function DraftGenerator({ briefId, audience, onCreated }: DraftGeneratorProps) {
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function generate(): void {
    setFailure(null);
    startTransition(async () => {
      const result = await createStakeholderDraft(briefId, { audience });
      if (result.ok) onCreated(result.data);
      else setFailure(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-3">
      <Button variant="secondary" pending={pending} pendingLabel="Drafting..." onClick={generate}>
        Draft update for {AUDIENCE_LABELS[audience].toLowerCase()}
      </Button>
      {failure !== null ? <InlineFailure failure={failure} prefix="Draft not generated." /> : null}
    </div>
  );
}
