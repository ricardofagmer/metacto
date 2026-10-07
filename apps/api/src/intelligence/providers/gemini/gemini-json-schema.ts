import { z } from 'zod';
import { JsonSchema, toToolInputSchema } from './zod-json-schema';

/**
 * Narrows the generic JSON Schema from zod-json-schema.ts to the subset Gemini accepts in
 * `parametersJsonSchema`. Gemini rejects or ignores string-length, pattern and exclusive-bound
 * keywords, so those become plain-language hints in `description`: the model still sees the
 * limit, and the zod parse after the call remains the enforcement.
 */
export class UnsupportedGeminiSchemaError extends Error {
  constructor(detail: string) {
    super(`Gemini parametersJsonSchema cannot carry ${detail}; extend gemini-json-schema.ts`);
    this.name = 'UnsupportedGeminiSchemaError';
  }
}

const PASSTHROUGH_KEYWORDS = new Set(['type', 'title', 'description', 'enum', 'minItems', 'maxItems', 'minimum', 'maximum', 'required', 'additionalProperties']);
// Gemini documents date-time for strings; any other format is described instead of sent.
const SUPPORTED_FORMATS = new Set(['date-time']);

type HintRule = { keyword: string; describe: (value: unknown) => string };

const HINT_RULES: HintRule[] = [
  { keyword: 'minLength', describe: (value) => `at least ${String(value)} characters` },
  { keyword: 'maxLength', describe: (value) => `at most ${String(value)} characters` },
  { keyword: 'pattern', describe: (value) => `must match the regular expression ${String(value)}` },
  { keyword: 'exclusiveMinimum', describe: (value) => `strictly greater than ${String(value)}` },
  { keyword: 'exclusiveMaximum', describe: (value) => `strictly less than ${String(value)}` },
];
const HINT_KEYWORDS = new Set(HINT_RULES.map((rule) => rule.keyword));

function isJsonSchema(value: unknown): value is JsonSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function childSchema(value: unknown, keyword: string): JsonSchema {
  if (!isJsonSchema(value)) {
    throw new UnsupportedGeminiSchemaError(`${keyword} (expected a schema object)`);
  }
  return toGeminiSchema(value);
}

function convertProperties(value: unknown): JsonSchema {
  if (!isJsonSchema(value)) {
    throw new UnsupportedGeminiSchemaError('properties (expected an object)');
  }
  return Object.fromEntries(Object.entries(value).map(([name, property]) => [name, childSchema(property, `properties.${name}`)]));
}

function convertAnyOf(value: unknown): JsonSchema[] {
  if (!Array.isArray(value)) {
    throw new UnsupportedGeminiSchemaError('anyOf (expected an array)');
  }
  return value.map((option: unknown) => childSchema(option, 'anyOf'));
}

function constAsEnum(value: unknown): unknown[] {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new UnsupportedGeminiSchemaError(`const of type ${typeof value}`);
  }
  return [value];
}

function describedHints(schema: JsonSchema): string[] {
  const hints = HINT_RULES.filter((rule) => schema[rule.keyword] !== undefined).map((rule) => rule.describe(schema[rule.keyword]));
  const format = schema.format;
  if (typeof format === 'string' && !SUPPORTED_FORMATS.has(format)) {
    hints.push(`format ${format}`);
  }
  return hints;
}

function toGeminiSchema(schema: JsonSchema): JsonSchema {
  const result: JsonSchema = {};
  Object.entries(schema).forEach(([keyword, value]) => {
    if (PASSTHROUGH_KEYWORDS.has(keyword)) result[keyword] = value;
    else if (keyword === 'properties') result.properties = convertProperties(value);
    else if (keyword === 'items') result.items = childSchema(value, 'items');
    else if (keyword === 'anyOf') result.anyOf = convertAnyOf(value);
    else if (keyword === 'const') result.enum = constAsEnum(value);
    else if (keyword === 'format') {
      if (typeof value === 'string' && SUPPORTED_FORMATS.has(value)) result.format = value;
    } else if (!HINT_KEYWORDS.has(keyword)) {
      // An unknown keyword fails the boot instead of silently loosening what the model is told.
      throw new UnsupportedGeminiSchemaError(`JSON Schema keyword ${keyword}`);
    }
  });
  const hints = describedHints(schema);
  if (hints.length > 0) {
    const existing = typeof result.description === 'string' ? `${result.description} ` : '';
    result.description = `${existing}Constraints: ${hints.join('; ')}.`;
  }
  return result;
}

export function toGeminiParametersSchema(schema: z.AnyZodObject): JsonSchema {
  return toGeminiSchema(toToolInputSchema(schema));
}
