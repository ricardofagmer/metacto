import { Module } from '@nestjs/common';
import { IntelligenceService } from '@fis/shared';
import { ConfigModule } from '../config/config.module';
import { EnvService } from '../config/env.service';
import { IntelligenceInfoService } from './intelligence-info.service';
import { HEURISTIC_INTELLIGENCE_SERVICE, INTELLIGENCE_SERVICE } from './intelligence.tokens';
import { AnthropicProvider } from './providers/anthropic/anthropic.provider';
import { HeuristicProvider } from './providers/heuristic/heuristic.provider';

export { HEURISTIC_INTELLIGENCE_SERVICE, INTELLIGENCE_SERVICE } from './intelligence.tokens';
export { type ActiveIntelligence, IntelligenceInfoService } from './intelligence-info.service';

// Selected once at boot (ADR 0003): a configured key means Anthropic, otherwise the heuristic.
function selectIntelligence(env: EnvService, heuristic: HeuristicProvider): IntelligenceService {
  const apiKey = env.anthropicApiKey;
  if (apiKey === undefined) {
    return heuristic;
  }
  return new AnthropicProvider({ apiKey, model: env.anthropicModel });
}

@Module({
  imports: [ConfigModule],
  providers: [
    { provide: HEURISTIC_INTELLIGENCE_SERVICE, useFactory: (): HeuristicProvider => new HeuristicProvider() },
    { provide: INTELLIGENCE_SERVICE, useFactory: selectIntelligence, inject: [EnvService, HEURISTIC_INTELLIGENCE_SERVICE] },
    IntelligenceInfoService,
  ],
  exports: [INTELLIGENCE_SERVICE, HEURISTIC_INTELLIGENCE_SERVICE, IntelligenceInfoService],
})
export class IntelligenceModule {}
