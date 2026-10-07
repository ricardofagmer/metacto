import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  API_ROUTES,
  CreateBriefBody,
  CreateBriefResponse,
  IdParams,
  ListBriefsQuery,
  ListBriefsResponse,
  RecordBriefDecisionBody,
  RecordBriefDecisionResponse,
} from '@fis/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StrictRateLimit } from '../security/rate-limit.decorator';
import { BriefsService } from './briefs.service';

@Controller()
export class BriefsController {
  constructor(private readonly briefsService: BriefsService) {}

  @Post(API_ROUTES.briefs)
  @StrictRateLimit()
  create(@Body(new ZodValidationPipe(CreateBriefBody)) body: CreateBriefBody): Promise<CreateBriefResponse> {
    return this.briefsService.create(body);
  }

  @Get(API_ROUTES.briefList)
  list(@Query(new ZodValidationPipe(ListBriefsQuery)) query: ListBriefsQuery): Promise<ListBriefsResponse> {
    return this.briefsService.list(query);
  }

  @Patch(API_ROUTES.briefDecision)
  decide(
    @Param(new ZodValidationPipe(IdParams)) params: IdParams,
    @Body(new ZodValidationPipe(RecordBriefDecisionBody)) body: RecordBriefDecisionBody,
  ): Promise<RecordBriefDecisionResponse> {
    return this.briefsService.decide(params.id, body);
  }
}
