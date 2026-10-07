import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { API_ROUTES, AnalyzeFeatureRequestResponse, IdParams } from '@fis/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StrictRateLimit } from '../security/rate-limit.decorator';
import { FeatureRequestAnalysisService } from './feature-request-analysis.service';

@Controller()
export class FeatureRequestAnalysisController {
  constructor(private readonly analysisService: FeatureRequestAnalysisService) {}

  @Post(API_ROUTES.analyze)
  @StrictRateLimit()
  @HttpCode(HttpStatus.OK)
  analyze(@Param(new ZodValidationPipe(IdParams)) params: IdParams): Promise<AnalyzeFeatureRequestResponse> {
    return this.analysisService.analyze(params.id);
  }
}
