import { Module } from '@nestjs/common';
import { AiBudgetModule } from '../ai-budget/ai-budget.module';
import { AnalysesModule } from '../analyses/analyses.module';
import { FeatureRequestsModule } from '../feature-requests/feature-requests.module';
import { ThemesModule } from '../themes/themes.module';
import { BriefSubjectLoader } from './brief-subject.loader';
import { BriefsController } from './briefs.controller';
import { BriefsRepository } from './briefs.repository';
import { BriefsService } from './briefs.service';
import { StakeholderDraftsController } from './stakeholder-drafts.controller';
import { StakeholderDraftsRepository } from './stakeholder-drafts.repository';
import { StakeholderDraftsService } from './stakeholder-drafts.service';

@Module({
  imports: [FeatureRequestsModule, AnalysesModule, ThemesModule, AiBudgetModule],
  controllers: [BriefsController, StakeholderDraftsController],
  providers: [BriefsRepository, StakeholderDraftsRepository, BriefSubjectLoader, BriefsService, StakeholderDraftsService],
})
export class BriefsModule {}
