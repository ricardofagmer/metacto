import { Inject, Injectable } from '@nestjs/common';
import { IntelligenceService, Provider } from '@fis/shared';
import { GeminiProvider } from './providers/gemini/gemini.provider';
import { INTELLIGENCE_SERVICE } from './intelligence.tokens';

export type ActiveIntelligence = {
  provider: Provider;
  model?: string | undefined;
};

// Read-only view of which provider was selected at boot, for /health and the web provider badge.
@Injectable()
export class IntelligenceInfoService {
  constructor(@Inject(INTELLIGENCE_SERVICE) private readonly intelligence: IntelligenceService) {}

  activeProvider(): Provider {
    return this.intelligence.provider;
  }

  describe(): ActiveIntelligence {
    if (this.intelligence instanceof GeminiProvider) {
      return { provider: this.intelligence.provider, model: this.intelligence.model };
    }
    return { provider: this.intelligence.provider };
  }
}
