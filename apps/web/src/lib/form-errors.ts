import type { ZodError } from 'zod';

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

// First message per top-level field, so each input shows one actionable error.
export function toFieldErrors<Field extends string>(error: ZodError, fields: readonly Field[]): FieldErrors<Field> {
  const errors: FieldErrors<Field> = {};
  for (const issue of error.issues) {
    const field = fields.find((candidate) => candidate === issue.path[0]);
    if (field !== undefined && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}
