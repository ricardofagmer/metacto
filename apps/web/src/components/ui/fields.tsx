import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const CONTROL =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted aria-[invalid=true]:border-danger';

type FieldShellProps = { id: string; label: string; error?: string; hint?: string; children: ReactNode };

function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint !== undefined ? (
        <p id={`${id}-hint`} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error !== undefined ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error: string | undefined, hint: string | undefined): string | undefined {
  const ids = [hint !== undefined ? `${id}-hint` : null, error !== undefined ? `${id}-error` : null].filter(
    (value): value is string => value !== null,
  );
  return ids.length > 0 ? ids.join(' ') : undefined;
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: string };

export function TextField({ id, label, error, hint, ...input }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input id={id} className={CONTROL} aria-invalid={error !== undefined} aria-describedby={describedBy(id, error, hint)} {...input} />
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; error?: string; hint?: string };

export function TextAreaField({ id, label, error, hint, ...textarea }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        className={`${CONTROL} min-h-28`}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...textarea}
      />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; options: ReadonlyArray<{ value: string; label: string }> };

export function SelectField({ id, label, options, ...select }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label}>
      <select id={id} className={CONTROL} {...select}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
