import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Clock } from '../common/clock';
import { RequestRejectedError } from '../common/domain-errors';
import { EnvService } from '../config/env.service';
import { FixedWindowRateLimiter, RateLimitDecision } from './fixed-window-rate-limiter';
import { STRICT_RATE_LIMIT_KEY } from './rate-limit.decorator';

const MILLISECONDS_PER_SECOND = 1000;
const UNKNOWN_CLIENT_KEY = 'unknown';
const RATE_LIMITED_MESSAGE = 'Too many requests; retry later';
const RETRY_AFTER_HEADER = 'Retry-After';

// Keyed on the socket address: `trust proxy` is off, so X-Forwarded-For cannot be spoofed to dodge the limit.
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly globalLimiter: FixedWindowRateLimiter;
  private readonly strictLimiter: FixedWindowRateLimiter;

  constructor(
    private readonly reflector: Reflector,
    private readonly clock: Clock,
    envService: EnvService,
  ) {
    const windowMs = envService.throttleWindowSeconds * MILLISECONDS_PER_SECOND;
    this.globalLimiter = new FixedWindowRateLimiter(windowMs, envService.throttleLimit);
    this.strictLimiter = new FixedWindowRateLimiter(windowMs, envService.throttleStrictLimit);
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const clientKey = request.ip ?? UNKNOWN_CLIENT_KEY;
    const nowMs = this.clock.nowEpochMs();

    const response = http.getResponse<Response>();

    this.enforce(this.globalLimiter.consume(clientKey, nowMs), response);
    if (this.reflector.get<boolean | undefined>(STRICT_RATE_LIMIT_KEY, context.getHandler()) === true) {
      this.enforce(this.strictLimiter.consume(clientKey, nowMs), response);
    }
    return true;
  }

  // The client address is personal data and is never logged; the filter records the rejection by code.
  private enforce(decision: RateLimitDecision, response: Response): void {
    if (decision.allowed) {
      return;
    }
    response.setHeader(RETRY_AFTER_HEADER, String(decision.retryAfterSeconds));
    throw new RequestRejectedError('rate_limited', HttpStatus.TOO_MANY_REQUESTS, RATE_LIMITED_MESSAGE);
  }
}
