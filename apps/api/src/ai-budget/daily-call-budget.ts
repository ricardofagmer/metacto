import { Clock } from '../common/clock';
import { appLogger } from '../common/json-logger';

const ISO_DATE_LENGTH = 10;

// Counts paid model calls per UTC day in process memory. A restart refills it and each instance holds its own
// counter, so the effective ceiling is budget x instances; a shared store is needed before scaling out.
export class DailyCallBudget {
  private day = '';
  private used = 0;
  private exhaustionReported = false;

  constructor(
    private readonly limit: number,
    private readonly clock: Clock,
  ) {}

  isExhausted(): boolean {
    this.rollOver();
    return this.used >= this.limit;
  }

  // Reserves before the call: a failed or timed-out model call still costs money.
  tryConsume(): boolean {
    if (this.isExhausted()) {
      this.reportExhaustion();
      return false;
    }
    this.used += 1;
    return true;
  }

  private rollOver(): void {
    const today = this.clock.nowIso().slice(0, ISO_DATE_LENGTH);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
      this.exhaustionReported = false;
    }
  }

  private reportExhaustion(): void {
    if (this.exhaustionReported) {
      return;
    }
    this.exhaustionReported = true;
    appLogger.event('warn', 'intelligence.daily_budget_exhausted', { day: this.day, budget: this.limit });
  }
}
