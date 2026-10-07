import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { API_ROUTES, ClusterRequestBody, ClusterResponse, ListThemesResponse } from '@fis/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StrictRateLimit } from '../security/rate-limit.decorator';
import { ThemesService } from './themes.service';

@Controller()
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get(API_ROUTES.themes)
  list(): Promise<ListThemesResponse> {
    return this.themesService.list();
  }

  // The empty body is still validated so unexpected fields are rejected rather than ignored.
  @Post(API_ROUTES.cluster)
  @StrictRateLimit()
  @HttpCode(HttpStatus.OK)
  cluster(@Body(new ZodValidationPipe(ClusterRequestBody)) _body: ClusterRequestBody): Promise<ClusterResponse> {
    return this.themesService.recluster();
  }
}
