'use client';

import {
  NOTE_MAX_LENGTH,
  UpdatableFeatureRequestStatus,
  UpdateFeatureRequestStatusBody,
  type FeatureRequestStatus,
} from '@fis/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { updateFeatureRequestStatus, type ApiFailure } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { SelectField, TextAreaField } from '@/components/ui/fields';
import { InlineFailure } from '@/components/ui/inline-failure';

type StatusFormProps = { requestId: string; currentStatus: FeatureRequestStatus; actingAs: string };

const STATUS_OPTIONS = UpdatableFeatureRequestStatus.options.map((status) => ({ value: status, label: STATUS_LABELS[status] }));

export function StatusForm({ requestId, currentStatus, actingAs }: StatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(currentStatus === 'merged' ? 'open' : currentStatus);
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFailure(null);
    setSaved(false);
    const trimmedNote = note.trim();
    const parsed = UpdateFeatureRequestStatusBody.safeParse({
      status,
      decidedBy: actingAs,
      note: trimmedNote === '' ? undefined : trimmedNote,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Invalid status change.');
      return;
    }
    setValidationError(null);
    startTransition(async () => {
      const result = await updateFeatureRequestStatus(requestId, parsed.data);
      if (!result.ok) {
        setFailure(result.error);
        return;
      }
      setNote('');
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-labelledby="status-form-heading">
      <h3 id="status-form-heading" className="text-sm font-semibold text-fg">
        Change status
      </h3>
      <SelectField id="status-select" label="New status" options={STATUS_OPTIONS} value={status} onChange={(event) => setStatus(event.target.value)} />
      <TextAreaField
        id="status-note"
        label="Note (shared with the decision record)"
        value={note}
        maxLength={NOTE_MAX_LENGTH}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        error={validationError ?? undefined}
      />
      <Button type="submit" pending={pending} pendingLabel="Saving...">
        Save status as {actingAs}
      </Button>
      {failure !== null ? <InlineFailure failure={failure} prefix="Status not changed." /> : null}
      {saved ? (
        <p role="status" className="text-sm text-success">
          Status updated.
        </p>
      ) : null}
    </form>
  );
}
