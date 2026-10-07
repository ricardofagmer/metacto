import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { API_ROUTES, IdParams, VoteBody, VoteCountResponse } from '@fis/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FeatureRequestVotesService } from './feature-request-votes.service';

@Controller()
export class FeatureRequestVotesController {
  constructor(private readonly votesService: FeatureRequestVotesService) {}

  @Post(API_ROUTES.featureRequestVotes)
  addVote(
    @Param(new ZodValidationPipe(IdParams)) params: IdParams,
    @Body(new ZodValidationPipe(VoteBody)) body: VoteBody,
  ): Promise<VoteCountResponse> {
    return this.votesService.addVote(params.id, body);
  }

  @Delete(API_ROUTES.featureRequestVotes)
  removeVote(
    @Param(new ZodValidationPipe(IdParams)) params: IdParams,
    @Body(new ZodValidationPipe(VoteBody)) body: VoteBody,
  ): Promise<VoteCountResponse> {
    return this.votesService.removeVote(params.id, body);
  }
}
