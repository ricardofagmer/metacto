import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { IntelligenceCapability, IntelligenceUnavailableError } from '@fis/shared';
import { describeIssues } from '../output-guard';
import { StructuredTool } from './anthropic-tools';
import { toToolInputSchema } from './zod-json-schema';

export type StructuredCallRequest<Schema extends z.AnyZodObject> = {
  capability: IntelligenceCapability;
  promptVersion: string;
  system: string;
  userContent: string;
  tool: StructuredTool<Schema>;
  maxTokens: number;
  // Checks a schema cannot express (refs that exist, no repeats). Returns problems, empty when valid.
  checkSemantics?: ((output: z.output<Schema>) => string[]) | undefined;
};

export type StructuredCallerOptions = {
  client: Anthropic;
  model: string;
};

// The schema-independent part of a request, which is all that sending and logging need.
type CallMetadata = Pick<StructuredCallRequest<z.AnyZodObject>, 'capability' | 'promptVersion' | 'system' | 'maxTokens'>;

type Attempt<Output> = { kind: 'valid'; output: Output } | { kind: 'invalid'; feedback: Anthropic.MessageParam };

const PROVIDER = 'anthropic';
// One retry with the validation error appended (spec, ADR 0003); transport retries are the SDK's.
const MAX_ATTEMPTS = 2;
// Classification-style work: low effort bounds thinking tokens inside max_tokens and cost.
const EFFORT = 'low';

export class AnthropicStructuredCaller {
  private readonly logger = new Logger('AnthropicProvider');

  constructor(private readonly options: StructuredCallerOptions) {}

  async call<Schema extends z.AnyZodObject>(request: StructuredCallRequest<Schema>): Promise<z.output<Schema>> {
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: request.userContent }];
    const tool: Anthropic.Tool = {
      name: request.tool.name,
      description: request.tool.description,
      input_schema: toToolInputSchema(request.tool.schema),
    };
    let lastProblem = 'no attempt made';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const response = await this.send({ request, tool, messages, attempt });
      const result = this.interpret(request, response);
      if (result.kind === 'valid') {
        return result.output;
      }
      messages.push({ role: 'assistant', content: response.content }, result.feedback);
      lastProblem = feedbackText(result.feedback);
    }
    throw this.unavailable(request.capability, `model output invalid after ${MAX_ATTEMPTS} attempts: ${lastProblem}`);
  }

  private async send(context: {
    request: CallMetadata;
    tool: Anthropic.Tool;
    messages: Anthropic.MessageParam[];
    attempt: number;
  }): Promise<Anthropic.Message> {
    const startedAt = Date.now();
    try {
      // Forced tool_choice and non-default temperature are rejected by current models
      // (claude-sonnet-5-5 and later), so the single tool is offered with `auto` and a missing
      // call is handled as a validation failure below.
      const response = await this.options.client.messages.create({
        model: this.options.model,
        max_tokens: context.request.maxTokens,
        system: context.request.system,
        messages: context.messages,
        tools: [context.tool],
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        output_config: { effort: EFFORT },
      });
      this.logCall(context, { durationMs: Date.now() - startedAt, outcome: response.stop_reason ?? 'unknown', usage: response.usage });
      return response;
    } catch (error) {
      this.logCall(context, { durationMs: Date.now() - startedAt, outcome: errorOutcome(error) });
      throw this.unavailable(context.request.capability, `model call failed: ${errorOutcome(error)}`, error);
    }
  }

  private interpret<Schema extends z.AnyZodObject>(request: StructuredCallRequest<Schema>, response: Anthropic.Message): Attempt<z.output<Schema>> {
    if (response.stop_reason === 'refusal') {
      throw this.unavailable(request.capability, 'model declined the request (stop_reason refusal)');
    }
    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === request.tool.name);
    if (toolUse === undefined) {
      const reason = response.stop_reason === 'max_tokens' ? 'the response hit max_tokens before the tool call completed' : 'no tool call was made';
      return { kind: 'invalid', feedback: { role: 'user', content: `${reason}. Call the tool \`${request.tool.name}\` exactly once with the complete result.` } };
    }
    const parsed = request.tool.schema.safeParse(toolUse.input);
    const problems = parsed.success ? (request.checkSemantics?.(parsed.data) ?? []) : [describeIssues(parsed.error)];
    if (parsed.success && problems.length === 0) {
      return { kind: 'valid', output: parsed.data };
    }
    this.logger.warn({ event: 'intelligence.output_invalid', capability: request.capability, promptVersion: request.promptVersion, model: this.options.model, problemCount: problems.length });
    return {
      kind: 'invalid',
      feedback: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Validation failed: ${problems.join('; ')}. Call \`${request.tool.name}\` again with corrected input.`,
          },
        ],
      },
    };
  }

  private logCall(
    context: { request: CallMetadata; attempt: number },
    result: { durationMs: number; outcome: string; usage?: Anthropic.Usage | undefined },
  ): void {
    // Metadata only: prompt text and model output can carry user content and never reach logs.
    this.logger.log({
      event: 'intelligence.call',
      provider: PROVIDER,
      capability: context.request.capability,
      promptVersion: context.request.promptVersion,
      model: this.options.model,
      attempt: context.attempt,
      durationMs: result.durationMs,
      inputTokens: result.usage?.input_tokens ?? null,
      outputTokens: result.usage?.output_tokens ?? null,
      outcome: result.outcome,
    });
  }

  private unavailable(capability: IntelligenceCapability, message: string, cause?: unknown): IntelligenceUnavailableError {
    return new IntelligenceUnavailableError(`anthropic ${capability}: ${message}`, { capability, provider: PROVIDER, cause });
  }
}

function feedbackText(feedback: Anthropic.MessageParam): string {
  if (typeof feedback.content === 'string') {
    return feedback.content;
  }
  return feedback.content.map((block) => (block.type === 'tool_result' && typeof block.content === 'string' ? block.content : block.type)).join(' ');
}

// Status and class name only: SDK error messages can echo request fragments.
function errorOutcome(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `api_error_${error.status ?? 'connection'}`;
  }
  return error instanceof Error ? error.name : 'unknown_error';
}
