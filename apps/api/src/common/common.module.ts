import { Global, Module } from '@nestjs/common';
import { Clock, IdFactory } from './clock';

@Global()
@Module({
  providers: [Clock, IdFactory],
  exports: [Clock, IdFactory],
})
export class CommonModule {}
