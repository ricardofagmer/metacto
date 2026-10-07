import { Injectable } from '@nestjs/common';
import { Analysis, AnalyzeOutput } from '@fis/shared';
import { Clock } from '../common/clock';
import { AnalysesRepository } from './analyses.repository';
import { toAnalysis, toAnalysisEntity } from './analysis.mapper';
import { PriorityProvenance } from './priority-provenance';

// Storage of AI analyses; it never decides anything, it only records what a provider produced.
@Injectable()
export class AnalysesService {
  constructor(
    private readonly analysesRepository: AnalysesRepository,
    private readonly clock: Clock,
  ) {}

  async findForRequest(featureRequestId: string): Promise<Analysis | null> {
    const entity = await this.analysesRepository.findByRequestId(featureRequestId);
    return entity === null ? null : toAnalysis(entity);
  }

  async findForRequests(featureRequestIds: string[]): Promise<Analysis[]> {
    const entities = await this.analysesRepository.findByRequestIds(featureRequestIds);
    return entities.map(toAnalysis);
  }

  // Score and the provider that produced it travel together so a heuristic score is never shown as AI.
  findPriorityProvenance(featureRequestIds: string[]): Promise<Map<string, PriorityProvenance>> {
    return this.analysesRepository.findPriorityProvenance(featureRequestIds);
  }

  async store(output: AnalyzeOutput): Promise<Analysis> {
    const entity = toAnalysisEntity(output, this.clock.nowIso());
    await this.analysesRepository.upsert(entity);
    return toAnalysis(entity);
  }
}
