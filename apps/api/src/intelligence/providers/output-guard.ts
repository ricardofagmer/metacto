import { z } from 'zod';
import { IntelligenceCapability, IntelligenceUnavailableError, Provider } from '@fis/shared';

export type OutputGuardContext = {
  capability: IntelligenceCapability;
  provider: Provider;
};

const MAX_REPORTED_ISSUES = 10;

export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join('; ');
}

// Last line of the port contract: nothing leaves a provider unless it parses as the shared output.
export function ensureValidOutput<Schema extends z.ZodTypeAny>(schema: Schema, value: unknown, context: OutputGuardContext): z.output<Schema> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new IntelligenceUnavailableError(`${context.provider} ${context.capability} output failed contract validation: ${describeIssues(parsed.error)}`, {
      capability: context.capability,
      provider: context.provider,
      cause: parsed.error,
    });
  }
  return parsed.data;
}
