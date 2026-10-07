'use client';

import {
  AUTHOR_NAME_MAX_LENGTH,
  CreateFeatureRequestBody,
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type CreateFeatureRequestResponse,
} from '@fis/shared';
import { useState, useTransition, type FormEvent } from 'react';
import { createFeatureRequest, type ApiFailure } from '@/lib/api';
import { toFieldErrors, type FieldErrors } from '@/lib/form-errors';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/fields';
import { ErrorState } from '@/components/ui/states';

const FIELDS = ['title', 'description', 'authorName'] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;

const EMPTY_VALUES: Values = { title: '', description: '', authorName: '' };

type SubmitFormProps = { onSubmitted: (response: CreateFeatureRequestResponse) => void };

// No request is sent while typing: duplicate detection runs once, server-side, on submit.
export function SubmitForm({ onSubmitted }: SubmitFormProps) {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function update(field: Field, value: string): void {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFailure(null);
    const parsed = CreateFeatureRequestBody.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error, FIELDS));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await createFeatureRequest(parsed.data);
      if (result.ok) onSubmitted(result.data);
      else setFailure(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-card border border-border bg-surface p-5" aria-describedby="submit-help">
      <p id="submit-help" className="text-sm text-fg-muted">
        Describe the problem you want solved. After you submit, we check for similar requests so votes are not split.
      </p>
      <TextField
        id="request-title"
        label="Title"
        value={values.title}
        maxLength={TITLE_MAX_LENGTH}
        onChange={(event) => update('title', event.target.value)}
        error={errors.title}
        required
      />
      <TextAreaField
        id="request-description"
        label="Description"
        value={values.description}
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={6}
        hint="What are you trying to do, and what gets in the way today?"
        onChange={(event) => update('description', event.target.value)}
        error={errors.description}
        required
      />
      <TextField
        id="request-author"
        label="Your name"
        value={values.authorName}
        maxLength={AUTHOR_NAME_MAX_LENGTH}
        autoComplete="name"
        onChange={(event) => update('authorName', event.target.value)}
        error={errors.authorName}
        required
      />
      {failure !== null ? <ErrorState title="Your request was not submitted" failure={failure} /> : null}
      <Button type="submit" pending={pending} pendingLabel="Submitting and checking for duplicates...">
        Submit request
      </Button>
    </form>
  );
}
