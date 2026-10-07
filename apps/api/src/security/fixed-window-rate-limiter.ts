export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const MILLISECONDS_PER_SECOND = 1000;

// Aligned fixed windows: every key resets at the same boundary, so the whole map is dropped at once and memory is
// bounded by the distinct clients seen in one window. Single-process only; a multi-instance deploy needs a shared store.
export class FixedWindowRateLimiter {
  private readonly hitsByKey = new Map<string, number>();
  private currentWindowStart = 0;

  constructor(
    private readonly windowMs: number,
    private readonly limit: number,
  ) {}

  consume(key: string, nowMs: number): RateLimitDecision {
    const windowStart = nowMs - (nowMs % this.windowMs);
    if (windowStart !== this.currentWindowStart) {
      this.hitsByKey.clear();
      this.currentWindowStart = windowStart;
    }
    const hits = (this.hitsByKey.get(key) ?? 0) + 1;
    this.hitsByKey.set(key, hits);
    if (hits <= this.limit) {
      return { allowed: true };
    }
    return { allowed: false, retryAfterSeconds: Math.ceil((windowStart + this.windowMs - nowMs) / MILLISECONDS_PER_SECOND) };
  }
}
