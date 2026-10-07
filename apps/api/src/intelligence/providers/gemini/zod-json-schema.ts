import { z } from 'zod';

export type JsonSchema = { [keyword: string]: unknown };

export type ToolInputSchema = JsonSchema & {
  type: 'object';
  properties: Record<string, JsonSchema>;
  required: string[];
};

export class UnsupportedSchemaError extends Error {
  constructor(typeName: string) {
    super(`zod type ${typeName} has no JSON Schema mapping; extend zod-json-schema.ts`);
    this.name = 'UnsupportedSchemaError';
  }
}

/**
 * Hand-written converter for the zod v3 subset the tool schemas use. A dependency would add a
 * package for ~80 lines, and an unsupported type throws at boot instead of silently emitting a
 * looser schema than the zod validator enforces.
 */
function convertString(schema: z.ZodString): JsonSchema {
  const result: JsonSchema = { type: 'string' };
  schema._def.checks.forEach((check) => {
    if (check.kind === 'min') result.minLength = check.value;
    if (check.kind === 'max') result.maxLength = check.value;
    if (check.kind === 'uuid') result.format = 'uuid';
    if (check.kind === 'datetime') result.format = 'date-time';
    if (check.kind === 'regex') result.pattern = check.regex.source;
  });
  return result;
}

function convertNumber(schema: z.ZodNumber): JsonSchema {
  const result: JsonSchema = { type: 'number' };
  schema._def.checks.forEach((check) => {
    if (check.kind === 'int') result.type = 'integer';
    if (check.kind === 'min') result[check.inclusive ? 'minimum' : 'exclusiveMinimum'] = check.value;
    if (check.kind === 'max') result[check.inclusive ? 'maximum' : 'exclusiveMaximum'] = check.value;
  });
  return result;
}

function convertArray(schema: z.ZodArray<z.ZodTypeAny>): JsonSchema {
  const result: JsonSchema = { type: 'array', items: toJsonSchema(schema.element) };
  if (schema._def.minLength !== null) result.minItems = schema._def.minLength.value;
  if (schema._def.maxLength !== null) result.maxItems = schema._def.maxLength.value;
  return result;
}

function convertObject(schema: z.AnyZodObject): ToolInputSchema {
  const shape: z.ZodRawShape = schema.shape;
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  Object.entries(shape).forEach(([key, value]) => {
    properties[key] = toJsonSchema(value);
    if (!value.isOptional()) {
      required.push(key);
    }
  });
  return { type: 'object', properties, required, additionalProperties: false };
}

export function toJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  if (schema instanceof z.ZodString) return convertString(schema);
  if (schema instanceof z.ZodNumber) return convertNumber(schema);
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodArray) return convertArray(schema);
  if (schema instanceof z.ZodObject) return convertObject(schema);
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: [...schema.options] };
  if (schema instanceof z.ZodLiteral) return { const: schema.value };
  if (schema instanceof z.ZodUnion) return { anyOf: schema.options.map((option: z.ZodTypeAny) => toJsonSchema(option)) };
  if (schema instanceof z.ZodOptional) return toJsonSchema(schema.unwrap());
  if (schema instanceof z.ZodDefault) return toJsonSchema(schema.removeDefault());
  // Refinements cannot be expressed in JSON Schema; the zod parse after the call enforces them.
  if (schema instanceof z.ZodEffects) return toJsonSchema(schema.innerType());
  throw new UnsupportedSchemaError(schema.constructor.name);
}

export function toToolInputSchema(schema: z.AnyZodObject): ToolInputSchema {
  return convertObject(schema);
}
