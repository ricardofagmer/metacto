'use client';

import { MergeFeatureRequestBody, NOTE_MAX_LENGTH } from '@fis/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { mergeFeatureRequest, type ApiFailure } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextAreaField } from '@/components/ui/fields';
import { InlineFailure } from '@/components/ui/inline-failure';
import { MergeTargetSearch, type MergeTarget } from './merge-target-search';

type MergeFormProps = { requestId: string; suggestions: MergeTarget[]; actingAs: string };

export function MergeForm({ requestId, suggestions, actingAs }: MergeFormProps) {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<MergeTarget[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const options = [...suggestions, ...searchResults.filter((result) => !suggestions.some((suggestion) => suggestion.id === result.id))];

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFailure(null);
    const trimmedNote = note.trim();
    const parsed = MergeFeatureRequestBody.safeParse({ targetId, decidedBy: actingAs, note: trimmedNote === '' ? undefined : trimmedNote });
    if (!parsed.success || !confirmed) return;
    startTransition(async () => {
      const result = await mergeFeatureRequest(requestId, parsed.data);
      if (result.ok) router.refresh();
      else setFailure(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-labelledby="merge-form-heading">
      <h3 id="merge-form-heading" className="text-sm font-semibold text-fg">
        Merge into another request
      </h3>
      <p className="text-xs text-fg-muted">Votes move to the target. A merged request cannot change status again.</p>
      <MergeTargetSearch excludeId={requestId} onResults={setSearchResults} />
      {options.length === 0 ? (
        <p className="text-sm text-fg-muted">No suggested targets. Search for the request to merge into.</p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-fg">Target request</legend>
          {options.map((option) => (
            <label key={option.id} className="flex items-start gap-2 text-sm text-fg">
              <input
                type="radio"
                name="merge-target"
                value={option.id}
                checked={targetId === option.id}
                onChange={() => setTargetId(option.id)}
                className="mt-1"
              />
              {option.title}
            </label>
          ))}
        </fieldset>
      )}
      <TextAreaField id="merge-note" label="Note (optional)" value={note} maxLength={NOTE_MAX_LENGTH} rows={2} onChange={(event) => setNote(event.target.value)} />
      <label className="flex items-start gap-2 text-sm text-fg">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
        I understand this merge cannot be undone.
      </label>
      <Button type="submit" variant="danger" pending={pending} pendingLabel="Merging..." disabled={targetId === null || !confirmed}>
        Merge as {actingAs}
      </Button>
      {failure !== null ? <InlineFailure failure={failure} prefix="Merge failed." /> : null}
    </form>
  );
}
