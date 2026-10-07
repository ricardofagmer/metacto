import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { API_PREFIX, CORRELATION_ID_HEADER } from '@fis/shared';
import { AppModule } from './app.module';
import { correlationIdMiddleware, restoreRequestContextMiddleware } from './common/correlation-id.middleware';
import { appLogger } from './common/json-logger';
import { requestLoggingMiddleware } from './common/request-logging.middleware';
import { EnvService } from './config/env.service';
import { bodyParserErrorsMiddleware } from './security/body-parser-errors.middleware';
import { jsonContentTypeMiddleware } from './security/json-content-type.middleware';
import { securityHeadersMiddleware } from './security/security-headers.middleware';

// Bounds request bodies well above the largest valid payload (4000-char description) to cap abuse.
const BODY_SIZE_LIMIT = '64kb';
const CORS_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];
const POWERED_BY_SETTING = 'x-powered-by';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: appLogger, bodyParser: false });
  const envService = app.get(EnvService);

  app.disable(POWERED_BY_SETTING);
  // Order is load-bearing: the correlation id and request log must exist before anything can reject the request,
  // CORS headers must be on rejections so the web client can read the envelope, and the media-type gate runs
  // before the body is parsed.
  app.use(correlationIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(securityHeadersMiddleware);
  app.enableCors({
    origin: envService.webOrigin,
    methods: CORS_METHODS,
    allowedHeaders: ['content-type', CORRELATION_ID_HEADER],
    exposedHeaders: [CORRELATION_ID_HEADER],
  });
  app.use(jsonContentTypeMiddleware);
  app.useBodyParser('json', { limit: BODY_SIZE_LIMIT });
  app.use(bodyParserErrorsMiddleware);
  app.use(restoreRequestContextMiddleware);
  app.setGlobalPrefix(API_PREFIX);
  // Lets SIGTERM close the HTTP server and the TypeORM connection before exit.
  app.enableShutdownHooks();

  await app.listen(envService.port);
  appLogger.event('info', 'app.started', { port: envService.port, prefix: API_PREFIX });
}

bootstrap().catch((error: unknown) => {
  appLogger.event('error', 'app.start_failed', {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
