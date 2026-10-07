import { Module } from '@nestjs/common';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [IntelligenceModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
