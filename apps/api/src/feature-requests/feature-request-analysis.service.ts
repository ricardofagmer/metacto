import { Inject, Injectable } from '@nestjs/common';
import { Analysis, IntelligenceService, computePriorityScore } from '@fis/shared';
import { appLogger } from '../common/json-logger';
import { AnalysesService } from '../analyses/analyses.service';
import { BUDGETED_INTELLIGENCE_SERVICE } from '../ai-budget/ai-budget.module';
import { FeatureRequestsService } from './feature-requests.service';

// Stores the AI analysis of a request; it never touches status, merge links or votes (ADR 0004).
@Injectable()
export class FeatureRequestAnalysisService {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly analysesService: AnalysesService,
    @Inject(BUDGETED_INTELLIGENCE_SERVICE) private readonly intelligence: IntelligenceService,
  ) {}

  async analyze(id: string): Promise<Analysis> {
    const request = await this.featureRequestsService.requireSummary(id);
    const corpus = await this.featureRequestsService.loadCorpus(id);
    const output = await this.intelligence.analyze({
      request: { id: request.id, title: request.title, description: request.description },
      corpus,
    });
    const knownIds = new Set(corpus.map((summary) => summary.id));
    // The aggregate is always recomputed here so a provider can never bend the score (ADR 0007).
    const analysis = await this.analysesService.store({
      ...output,
      featureRequestId: id,
      duplicateCandidates: output.duplicateCandidates.filter((candidate) => knownIds.has(candidate.id)),
      priority: { ...output.priority, score: computePriorityScore(output.priority.breakdown) },
    });
    appLogger.event('info', 'feature_request.analyzed', {
      featureRequestId: id,
      provider: analysis.provider,
      promptVersion: analysis.promptVersion,
      priorityScore: analysis.priority.score,
    });
    return analysis;
  }
}
