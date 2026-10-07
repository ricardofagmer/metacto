import { Analysis, AnalyzeOutput } from '@fis/shared';
import { AnalysisEntity } from '../database/entities';

export function toAnalysis(entity: AnalysisEntity): Analysis {
  return Analysis.parse({
    featureRequestId: entity.featureRequestId,
    underlyingNeed: entity.underlyingNeed,
    duplicateCandidates: entity.duplicateCandidates,
    priority: entity.priority,
    provider: entity.provider,
    model: entity.model ?? undefined,
    promptVersion: entity.promptVersion,
    createdAt: entity.createdAt,
  });
}

export function toAnalysisEntity(output: AnalyzeOutput, createdAt: string): AnalysisEntity {
  const entity = new AnalysisEntity();
  entity.featureRequestId = output.featureRequestId;
  entity.underlyingNeed = output.underlyingNeed;
  entity.duplicateCandidates = output.duplicateCandidates;
  entity.priority = output.priority;
  entity.priorityScore = output.priority.score;
  entity.provider = output.provider;
  entity.model = output.model ?? null;
  entity.promptVersion = output.promptVersion;
  entity.createdAt = createdAt;
  return entity;
}
