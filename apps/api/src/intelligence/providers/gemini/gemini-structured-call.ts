import { ApiError, Content, FinishReason, FunctionCall, FunctionCallingConfigMode, GenerateContentConfig, GenerateContentResponse, GenerateContentResponseUsageMetadata, GoogleGenAI } from '@google/genai';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { IntelligenceCapability, IntelligenceUnavailableError } from '@fis/shared';
import { describeIssues } from '../output-guard';
import { toGeminiParametersSchema } from './gemini-json-schema';
import { StructuredTool } from './gemini-tools';

export type StructuredCallRequest<Schema extends z.AnyZodObject> = {
  capability: IntelligenceCapability;
  promptVersion: string;
  system: string;
  userContent: string;
  tool: StructuredTool<Schema>;
  maxOutputTokens: number;
  // Checks a schema cannot express (refs that exist, no repeats). Returns problems, empty when valid.
  checkSemantics?: ((output: z.output<Schema>) => string[]) | undefined;
};

export type StructuredCallerOptions = {
  client: GoogleGenAI;
  model: string;
};

// The schema-independent part of a request, which is all that sending and logging need.
type CallMetadata = Pick<StructuredCallRequest<z.AnyZodObject>, 'capability' | 'promptVersion' | 'system' | 'maxOutputTokens'>;

type ForcedFunction = Pick<GenerateContentConfig, 'tools' | 'toolConfig'>;

type Attempt<Output> = { kind: 'valid'; output: Output } | { kind: 'invalid'; feedback: Content; problem: string };

const PROVIDER = 'gemini';
// One retry with the validation error appended (spec, ADR 0003); transport retries are the SDK's.
const MAX_ATTEMPTS = 2;
// Classification-style work: a small fixed thinking budget keeps thinking tokens, which Gemini
// counts against maxOutputTokens, from crowding out the function-call arguments, and bounds cost.
const THINKING_BUDGET_TOKENS = 512;
// Stops that mean the model or its safety layer withheld output; a retry would not change the answer.
const BLOCKED_FINISH_REASONS: ReadonlySet<FinishReason> = new Set([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

/**
 * Structured output through one forced function call (mode ANY, single allowed name). Function
 * calling rather than JSON mode keeps the versioned prompts, which instruct a tool call, valid
 * without a prompt bump; the zod parse below stays the trust boundary either way.
 */
export class GeminiStructuredCaller {
  private readonly logger = new Logger('GeminiProvider');

  constructor(private readonly options: StructuredCallerOptions) {}

  async call<Schema extends z.AnyZodObject>(request: StructuredCallRequest<Schema>): Promise<z.output<Schema>> {
    const contents: Content[] = [{ role: 'user', parts: [{ text: request.userContent }] }];
    const forcedFunction: ForcedFunction = {
      tools: [
        {
          functionDeclarations: [
            { name: request.tool.name, description: request.tool.description, parametersJsonSchema: toGeminiParametersSchema(request.tool.schema) },
          ],
        },
      ],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: [request.tool.name] } },
    };
    let lastProblem = 'no attempt made';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const response = await this.send({ request, forcedFunction, contents, attempt });
      const result = this.interpret(request, response);
      if (result.kind === 'valid') {
        return result.output;
      }
      const modelTurn = response.candidates?.[0]?.content;
      // The model turn is echoed verbatim so thought signatures survive into the corrective turn.
      contents.push(...(modelTurn === undefined ? [] : [modelTurn]), result.feedback);
      lastProblem = result.problem;
    }
    throw this.unavailable(request.capability, `model output invalid after ${MAX_ATTEMPTS} attempts: ${lastProblem}`);
  }

  private async send(context: { request: CallMetadata; forcedFunction: ForcedFunction; contents: Content[]; attempt: number }): Promise<GenerateContentResponse> {
    const startedAt = Date.now();
    try {
      const response = await this.options.client.models.generateContent({
        model: this.options.model,
        contents: context.contents,
        config: {
          systemInstruction: context.request.system,
          maxOutputTokens: context.request.maxOutputTokens,
          thinkingConfig: { thinkingBudget: THINKING_BUDGET_TOKENS },
          ...context.forcedFunction,
        },
      });
      this.logCall(context, { durationMs: Date.now() - startedAt, outcome: responseOutcome(response), usage: response.usageMetadata });
      return response;
    } catch (error) {
      this.logCall(context, { durationMs: Date.now() - startedAt, outcome: errorOutcome(error) });
      throw this.unavailable(context.request.capability, `model call failed: ${errorOutcome(error)}`, error);
    }
  }

  private interpret<Schema extends z.AnyZodObject>(request: StructuredCallRequest<Schema>, response: GenerateContentResponse): Attempt<z.output<Schema>> {
    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason !== undefined) {
      throw this.unavailable(request.capability, `prompt was blocked (blockReason ${blockReason})`);
    }
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason !== undefined && BLOCKED_FINISH_REASONS.has(finishReason)) {
      throw this.unavailable(request.capability, `model declined the request (finishReason ${finishReason})`);
    }
    const functionCall = response.functionCalls?.find((call) => call.name === request.tool.name);
    if (functionCall === undefined) {
      const reason = finishReason === FinishReason.MAX_TOKENS ? 'the response hit maxOutputTokens before the function call completed' : 'no function call was made';
      const problem = `${reason}. Call the function \`${request.tool.name}\` exactly once with the complete result.`;
      return { kind: 'invalid', problem, feedback: { role: 'user', parts: [{ text: problem }] } };
    }
    const parsed = request.tool.schema.safeParse(functionCall.args);
    const problems = parsed.success ? (request.checkSemantics?.(parsed.data) ?? []) : [describeIssues(parsed.error)];
    if (parsed.success && problems.length === 0) {
      return { kind: 'valid', output: parsed.data };
    }
    this.logger.warn({ event: 'intelligence.output_invalid', capability: request.capability, promptVersion: request.promptVersion, model: this.options.model, problemCount: problems.length });
    const problem = `Validation failed: ${problems.join('; ')}. Call \`${request.tool.name}\` again with corrected arguments.`;
    return { kind: 'invalid', problem, feedback: functionErrorTurn(functionCall, problem) };
  }

  private logCall(
    context: { request: CallMetadata; attempt: number },
    result: { durationMs: number; outcome: string; usage?: GenerateContentResponseUsageMetadata | undefined },
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
      inputTokens: result.usage?.promptTokenCount ?? null,
      outputTokens: result.usage?.candidatesTokenCount ?? null,
      thinkingTokens: result.usage?.thoughtsTokenCount ?? null,
      outcome: result.outcome,
    });
  }

  private unavailable(capability: IntelligenceCapability, message: string, cause?: unknown): IntelligenceUnavailableError {
    return new IntelligenceUnavailableError(`gemini ${capability}: ${message}`, { capability, provider: PROVIDER, cause });
  }
}

// A function call must be answered by a functionResponse carrying the same id and name.
function functionErrorTurn(functionCall: FunctionCall, problem: string): Content {
  return {
    role: 'user',
    parts: [{ functionResponse: { id: functionCall.id, name: functionCall.name, response: { error: problem } } }],
  };
}

function responseOutcome(response: GenerateContentResponse): string {
  return response.promptFeedback?.blockReason ?? response.candidates?.[0]?.finishReason ?? 'unknown';
}

// Status and class name only: SDK error messages can echo request fragments.
function errorOutcome(error: unknown): string {
  if (error instanceof ApiError) {
    return `api_error_${error.status}`;
  }
  return error instanceof Error ? error.name : 'unknown_error';
}
