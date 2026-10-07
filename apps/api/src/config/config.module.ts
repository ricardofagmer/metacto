import { Global, Module } from '@nestjs/common';
import { EnvService, loadEnv } from './env.service';

// Global so the intelligence module and every feature module can inject EnvService without re-importing.
@Global()
@Module({
  providers: [{ provide: EnvService, useFactory: (): EnvService => new EnvService(loadEnv()) }],
  exports: [EnvService],
})
export class ConfigModule {}
