import { Module } from '@nestjs/common';
import { AnalysesRepository } from './analyses.repository';
import { AnalysesService } from './analyses.service';

@Module({
  providers: [AnalysesRepository, AnalysesService],
  exports: [AnalysesService],
})
export class AnalysesModule {}
