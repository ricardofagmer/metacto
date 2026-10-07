import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  API_ROUTES,
  CreateFeatureRequestBody,
  CreateFeatureRequestResponse,
  GetFeatureRequestResponse,
  IdParams,
  ListFeatureRequestsQuery,
  ListFeatureRequestsResponse,
  MergeFeatureRequestBody,
  MergeFeatureRequestResponse,
  UpdateFeatureRequestStatusBody,
  UpdateFeatureRequestStatusResponse,
} from '@fis/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StrictRateLimit } from '../security/rate-limit.decorator';
import { FeatureRequestMergeService } from './feature-request-merge.service';
import { FeatureRequestsService } from './feature-requests.service';

@Controller()
export class FeatureRequestsController {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly mergeService: FeatureRequestMergeService,
  ) {}

  @Post(API_ROUTES.featureRequests)
  @StrictRateLimit()
  create(@Body(new ZodValidationPipe(CreateFeatureRequestBody)) body: CreateFeatureRequestBody): Promise<CreateFeatureRequestResponse> {
    return this.featureRequestsService.create(body);
  }

  @Get(API_ROUTES.featureRequests)
  list(@Query(new ZodValidationPipe(ListFeatureRequestsQuery)) query: ListFeatureRequestsQuery): Promise<ListFeatureRequestsResponse> {
    return this.featureRequestsService.list(query);
  }

  @Get(API_ROUTES.featureRequest)
  get(@Param(new ZodValidationPipe(IdParams)) params: IdParams): Promise<GetFeatureRequestResponse> {
    return this.featureRequestsService.getDetail(params.id);
  }

  @Post(API_ROUTES.featureRequestMerge)
  @HttpCode(HttpStatus.OK)
  merge(
    @Param(new ZodValidationPipe(IdParams)) params: IdParams,
    @Body(new ZodValidationPipe(MergeFeatureRequestBody)) body: MergeFeatureRequestBody,
  ): Promise<MergeFeatureRequestResponse> {
    return this.mergeService.merge(params.id, body);
  }

  @Patch(API_ROUTES.featureRequestStatus)
  updateStatus(
    @Param(new ZodValidationPipe(IdParams)) params: IdParams,
    @Body(new ZodValidationPipe(UpdateFeatureRequestStatusBody)) body: UpdateFeatureRequestStatusBody,
  ): Promise<UpdateFeatureRequestStatusResponse> {
    return this.featureRequestsService.updateStatus(params.id, body);
  }
}
