import { Injectable } from '@nestjs/common';
import { HealthResponse } from '@fis/shared';
import { UnitOfWork } from '../database/unit-of-work';
import { IntelligenceInfoService } from '../intelligence/intelligence.module';

export const API_VERSION = '0.1.0';

@Injectable()
export class HealthService {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly intelligenceInfo: IntelligenceInfoService,
  ) {}

  // The provider comes from the instance selected at boot, so /health cannot disagree with what actually serves requests.
  async check(): Promise<HealthResponse> {
    const databaseUp = await this.unitOfWork.isReachable();
    return HealthResponse.parse({
      status: 'ok',
      database: databaseUp ? 'up' : 'down',
      provider: this.intelligenceInfo.activeProvider(),
      version: API_VERSION,
    });
  }
}
