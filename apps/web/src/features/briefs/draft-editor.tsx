'use client';

import { DRAFT_BODY_MAX_LENGTH, UpdateStakeholderDraftBody, type StakeholderDraft } from '@fis/shared';
import { useState, useTransition } from 'react';
import { updateStakeholderDraft, type ApiFailure } from '@/lib/api';
import { AUDIENCE_LABELS, formatDate } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TextAreaField } from '@/components/ui/fields';
import { InlineFailure } from '@/components/ui/inline-failure';
import { ProviderBadge } from '@/components/ui/provenance';

type DraftEditorProps = { draft: StakeholderDraft; actingAs: string; onChange: (draft: StakeholderDraft) => void };

export function DraftEditor({ draft, actingAs, onChange }: DraftEditorProps) {
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const approved = draft.status === 'approved';
  const dirty = body !== draft.body;

  function save(approve: boolean): void {
    setFailure(null);
    const parsed = UpdateStakeholderDraftBody.safeParse({
      body: dirty ? body : undefined,
      status: approve ? 'approved' : undefined,
      updatedBy: actingAs,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'The draft is not valid.');
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await updateStakeholderDraft(draft.id, parsed.data);
      if (result.ok) onChange(result.data);
      else setFailure(result.error);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-fg">{AUDIENCE_LABELS[draft.audience]}</span>
        <ProviderBadge provider={draft.provider} model={draft.model} />
        <Badge tone={approved ? 'success' : 'warning'}>{approved ? `Approved by ${draft.updatedBy ?? 'a PM'}` : 'Draft - needs review'}</Badge>
        {approved ? (
          <span className="text-xs text-fg-muted">
            on <time dateTime={draft.updatedAt}>{formatDate(draft.updatedAt)}</time>
          </span>
        ) : null}
      </div>
      <TextAreaField
        id={`draft-${draft.id}`}
        label={`Update for ${AUDIENCE_LABELS[draft.audience].toLowerCase()}`}
        value={body}
        maxLength={DRAFT_BODY_MAX_LENGTH}
        rows={8}
        readOnly={approved}
        onChange={(event) => setBody(event.target.value)}
        error={error}
      />
      {approved ? null : (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" pending={pending} disabled={!dirty} onClick={() => save(false)}>
            Save edits
          </Button>
          <Button pending={pending} onClick={() => save(true)}>
            Approve as {actingAs}
          </Button>
        </div>
      )}
      {failure !== null ? <InlineFailure failure={failure} prefix="Draft not saved." /> : null}
    </div>
  );
}
