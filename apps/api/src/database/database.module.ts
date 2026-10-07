import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvService } from '../config/env.service';
import { buildDataSourceOptions } from './data-source-options';
import { UnitOfWork } from './unit-of-work';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvService],
      useFactory: (envService: EnvService) => buildDataSourceOptions(envService.databaseUrl),
    }),
  ],
  providers: [UnitOfWork],
  exports: [UnitOfWork],
})
export class DatabaseModule {}
