'use client';

import { NOTE_MAX_LENGTH, RecordBriefDecisionBody, type BriefDecisionStatus, type DecisionBrief } from '@fis/shared';
import { useState, useTransition } from 'react';
import { recordBriefDecision, type ApiFailure } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextAreaField } from '@/components/ui/fields';
import { InlineFailure } from '@/components/ui/inline-failure';

type BriefDecisionFormProps = { brief: DecisionBrief; actingAs: string; onDecided: (brief: DecisionBrief) => void };

const NOTE_REQUIRED = 'A note is required so the decision can be explained later.';

export function BriefDecisionForm({ brief, actingAs, onDecided }: BriefDecisionFormProps) {
  const noteId = `brief-${brief.id}-note`;
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(status: BriefDecisionStatus): void {
    setFailure(null);
    const decisionNote = note.trim();
    if (decisionNote === '') {
      setNoteError(NOTE_REQUIRED);
      return;
    }
    const parsed = RecordBriefDecisionBody.safeParse({ status, decidedBy: actingAs, decisionNote });
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? NOTE_REQUIRED);
      return;
    }
    setNoteError(undefined);
    startTransition(async () => {
      const result = await recordBriefDecision(brief.id, parsed.data);
      if (result.ok) onDecided(result.data);
      else setFailure(result.error);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-muted p-4">
      <TextAreaField
        id={noteId}
        label="Decision note (required)"
        value={note}
        maxLength={NOTE_MAX_LENGTH}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        error={noteError}
        required
      />
      <div className="flex flex-wrap gap-2">
        <Button pending={pending} onClick={() => decide('approved')}>
          Approve as {actingAs}
        </Button>
        <Button variant="danger" pending={pending} onClick={() => decide('rejected')}>
          Reject
        </Button>
      </div>
      {failure !== null ? <InlineFailure failure={failure} prefix="Decision not recorded." /> : null}
    </div>
  );
}
