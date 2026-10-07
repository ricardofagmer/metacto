import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  API_ROUTES,
  CreateStakeholderDraftBody,
  CreateStakeholderDraftResponse,
  IdParams,
  ListStakeholderDraftsResponse,
  UpdateStakeholderDraftBody,
  UpdateStakeholderDraftResponse,
} from '@fis/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StrictRateLimit } from '../security/rate-limit.decorator';
import { StakeholderDraftsService } from './stakeholder-drafts.service';

@Controller()
export class StakeholderDraftsController {
  constructor(private readonly draftsService: StakeholderDraftsService) {}

  @Post(API_ROUTES.briefDrafts)
  @StrictRateLimit()
  create(
    @Param(new ZodValidationPipe(IdParams)) params: IdParams,
    @Body(new ZodValidationPipe(CreateStakeholderDraftBody)) body: CreateStakeholderDraftBody,
  ): Promise<CreateStakeholderDraftResponse> {
    return this.draftsService.create(params.id, body.audience);
  }

  @Get(API_ROUTES.briefDrafts)
  list(@Param(new ZodValidationPipe(IdParams)) params: IdParams): Promise<ListStakeholderDraftsResponse> {
    return this.draftsService.listForBrief(params.id);
  }

  @Patch(API_ROUTES.draft)
  update(
    @Param(new ZodValidationPipe(IdParams)) params: IdParams,
    @Body(new ZodValidationPipe(UpdateStakeholderDraftBody)) body: UpdateStakeholderDraftBody,
  ): Promise<UpdateStakeholderDraftResponse> {
    return this.draftsService.update(params.id, body);
  }
}
