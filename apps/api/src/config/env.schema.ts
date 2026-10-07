import { z } from 'zod';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_DATABASE_URL = './data/fis.sqlite';
export const DEFAULT_PORT = 3001;
export const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';
export const DEFAULT_THROTTLE_WINDOW_SECONDS = 60;
export const DEFAULT_THROTTLE_LIMIT = 120;
export const DEFAULT_THROTTLE_STRICT_LIMIT = 20;
export const DEFAULT_AI_DAILY_CALL_BUDGET = 500;

const MAX_PORT = 65535;
const MAX_THROTTLE_WINDOW_SECONDS = 3600;
const MAX_THROTTLE_LIMIT = 100_000;
const MAX_AI_DAILY_CALL_BUDGET = 1_000_000;

// An empty value (as left by copying .env.example) means "unset", so the documented default applies.
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value.length === 0 ? undefined : value));

export const EnvSchema = z.object({
  GEMINI_API_KEY: optionalText,
  GEMINI_MODEL: optionalText.transform((value) => value ?? DEFAULT_GEMINI_MODEL),
  DATABASE_URL: optionalText.transform((value) => value ?? DEFAULT_DATABASE_URL),
  PORT: optionalText.pipe(z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT)),
  WEB_ORIGIN: optionalText.pipe(z.string().url().default(DEFAULT_WEB_ORIGIN)),
  THROTTLE_WINDOW_SECONDS: optionalText.pipe(
    z.coerce.number().int().min(1).max(MAX_THROTTLE_WINDOW_SECONDS).default(DEFAULT_THROTTLE_WINDOW_SECONDS),
  ),
  THROTTLE_LIMIT: optionalText.pipe(z.coerce.number().int().min(1).max(MAX_THROTTLE_LIMIT).default(DEFAULT_THROTTLE_LIMIT)),
  THROTTLE_STRICT_LIMIT: optionalText.pipe(z.coerce.number().int().min(1).max(MAX_THROTTLE_LIMIT).default(DEFAULT_THROTTLE_STRICT_LIMIT)),
  // 0 disables the Gemini path entirely while keeping the key configured.
  AI_DAILY_CALL_BUDGET: optionalText.pipe(
    z.coerce.number().int().min(0).max(MAX_AI_DAILY_CALL_BUDGET).default(DEFAULT_AI_DAILY_CALL_BUDGET),
  ),
});
export type Env = z.infer<typeof EnvSchema>;
