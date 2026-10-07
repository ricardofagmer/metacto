import { Controller, Get } from '@nestjs/common';
import { API_ROUTES, HealthResponse } from '@fis/shared';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(API_ROUTES.health)
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
