import { Module } from '@nestjs/common';
import { IntelligenceService } from '@fis/shared';
import { Clock } from '../common/clock';
import { EnvService } from '../config/env.service';
import { HEURISTIC_INTELLIGENCE_SERVICE, INTELLIGENCE_SERVICE, IntelligenceModule } from '../intelligence/intelligence.module';
import { BUDGETED_INTELLIGENCE_SERVICE } from './ai-budget.tokens';
import { BudgetedIntelligence } from './budgeted-intelligence';
import { DailyCallBudget } from './daily-call-budget';

export { BUDGETED_INTELLIGENCE_SERVICE } from './ai-budget.tokens';

function buildBudgetedIntelligence(
  primary: IntelligenceService,
  fallback: IntelligenceService,
  envService: EnvService,
  clock: Clock,
): IntelligenceService {
  return new BudgetedIntelligence(primary, fallback, new DailyCallBudget(envService.aiDailyCallBudget, clock));
}

// One module instance, so one counter shared by every importing feature module.
@Module({
  imports: [IntelligenceModule],
  providers: [
    {
      provide: BUDGETED_INTELLIGENCE_SERVICE,
      useFactory: buildBudgetedIntelligence,
      inject: [INTELLIGENCE_SERVICE, HEURISTIC_INTELLIGENCE_SERVICE, EnvService, Clock],
    },
  ],
  exports: [BUDGETED_INTELLIGENCE_SERVICE, IntelligenceModule],
})
export class AiBudgetModule {}
