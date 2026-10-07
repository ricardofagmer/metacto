import { Module } from '@nestjs/common';
import { VotesRepository } from './votes.repository';
import { VotesService } from './votes.service';

// Data-only module: the vote endpoints live under /feature-requests/:id/votes and are orchestrated by feature-requests.
@Module({
  providers: [VotesRepository, VotesService],
  exports: [VotesService],
})
export class VotesModule {}
