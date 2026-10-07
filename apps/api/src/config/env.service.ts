import { Env, EnvSchema } from './env.schema';

export class InvalidEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEnvironmentError';
  }
}

// The single place that reads process.env; everything else receives typed values from EnvService.
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new InvalidEnvironmentError(`Invalid environment configuration: ${fields}`);
  }
  return result.data;
}

export class EnvService {
  constructor(private readonly env: Env) {}

  get anthropicApiKey(): string | undefined {
    return this.env.ANTHROPIC_API_KEY;
  }

  get anthropicModel(): string {
    return this.env.ANTHROPIC_MODEL;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get port(): number {
    return this.env.PORT;
  }

  get webOrigin(): string {
    return this.env.WEB_ORIGIN;
  }

  get throttleWindowSeconds(): number {
    return this.env.THROTTLE_WINDOW_SECONDS;
  }

  get throttleLimit(): number {
    return this.env.THROTTLE_LIMIT;
  }

  get throttleStrictLimit(): number {
    return this.env.THROTTLE_STRICT_LIMIT;
  }

  get aiDailyCallBudget(): number {
    return this.env.AI_DAILY_CALL_BUDGET;
  }
}
