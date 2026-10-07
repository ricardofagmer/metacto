import { PipeTransform } from '@nestjs/common';
import { ZodError, ZodType, ZodTypeDef } from 'zod';
import { RequestValidationError } from './domain-errors';

const MAX_REPORTED_ISSUES = 5;

function describeIssues(error: ZodError): string {
  return error.issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
    .join('; ');
}

// Validates params, query or body against a frozen @fis/shared schema; strict schemas reject unknown keys (mass assignment).
export class ZodValidationPipe<Output> implements PipeTransform<unknown, Output> {
  constructor(private readonly schema: ZodType<Output, ZodTypeDef, unknown>) {}

  transform(value: unknown): Output {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new RequestValidationError(describeIssues(result.error));
    }
    return result.data;
  }
}
