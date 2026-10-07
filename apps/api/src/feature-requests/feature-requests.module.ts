import { Module } from '@nestjs/common';
import { AiBudgetModule } from '../ai-budget/ai-budget.module';
import { AnalysesModule } from '../analyses/analyses.module';
import { VotesModule } from '../votes/votes.module';
import { FeatureRequestAnalysisController } from './feature-request-analysis.controller';
import { FeatureRequestAnalysisService } from './feature-request-analysis.service';
import { FeatureRequestDecisionsRepository } from './feature-request-decisions.repository';
import { FeatureRequestMergeService } from './feature-request-merge.service';
import { FeatureRequestVotesController } from './feature-request-votes.controller';
import { FeatureRequestVotesService } from './feature-request-votes.service';
import { FeatureRequestsController } from './feature-requests.controller';
import { FeatureRequestsRepository } from './feature-requests.repository';
import { FeatureRequestsService } from './feature-requests.service';

@Module({
  imports: [AnalysesModule, VotesModule, AiBudgetModule],
  controllers: [FeatureRequestsController, FeatureRequestVotesController, FeatureRequestAnalysisController],
  providers: [
    FeatureRequestsRepository,
    FeatureRequestDecisionsRepository,
    FeatureRequestsService,
    FeatureRequestMergeService,
    FeatureRequestVotesService,
    FeatureRequestAnalysisService,
  ],
  exports: [FeatureRequestsService],
})
export class FeatureRequestsModule {}
