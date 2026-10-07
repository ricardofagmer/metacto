import { Module } from '@nestjs/common';
import { AiBudgetModule } from '../ai-budget/ai-budget.module';
import { FeatureRequestsModule } from '../feature-requests/feature-requests.module';
import { ThemeMembersRepository } from './theme-members.repository';
import { ThemesController } from './themes.controller';
import { ThemesRepository } from './themes.repository';
import { ThemesService } from './themes.service';

@Module({
  imports: [FeatureRequestsModule, AiBudgetModule],
  controllers: [ThemesController],
  providers: [ThemesRepository, ThemeMembersRepository, ThemesService],
  exports: [ThemesService],
})
export class ThemesModule {}
