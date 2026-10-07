import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AnalysesModule } from './analyses/analyses.module';
import { BriefsModule } from './briefs/briefs.module';
import { CommonModule } from './common/common.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { FeatureRequestsModule } from './feature-requests/feature-requests.module';
import { HealthModule } from './health/health.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { SecurityModule } from './security/security.module';
import { ThemesModule } from './themes/themes.module';
import { VotesModule } from './votes/votes.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    SecurityModule,
    DatabaseModule,
    IntelligenceModule,
    AnalysesModule,
    VotesModule,
    FeatureRequestsModule,
    ThemesModule,
    BriefsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
