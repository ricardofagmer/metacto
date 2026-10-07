import { FeatureRequest, FeatureRequestListItem, RequestSummary } from '@fis/shared';
import { PriorityProvenance } from '../analyses/priority-provenance';
import { FeatureRequestEntity } from '../database/entities';

// Parsing through the shared schema guarantees every response honours the frozen contract (merge-link invariant included).
export function toFeatureRequest(entity: FeatureRequestEntity): FeatureRequest {
  return FeatureRequest.parse({
    id: entity.id,
    title: entity.title,
    description: entity.description,
    authorName: entity.authorName,
    status: entity.status,
    mergedIntoId: entity.mergedIntoId ?? undefined,
    themeId: entity.themeId ?? undefined,
    voteCount: entity.voteCount,
    createdAt: entity.createdAt,
  });
}

export function toFeatureRequestListItem(entity: FeatureRequestEntity, priority: PriorityProvenance | undefined): FeatureRequestListItem {
  return FeatureRequestListItem.parse({
    ...toFeatureRequest(entity),
    priorityScore: priority?.score,
    priorityProvider: priority?.provider,
    priorityModel: priority?.model,
  });
}

// Only id, title, description, votes and status reach a model; author names never do (spec, redaction note).
export function toRequestSummary(entity: FeatureRequestEntity): RequestSummary {
  return RequestSummary.parse({
    id: entity.id,
    title: entity.title,
    description: entity.description,
    voteCount: entity.voteCount,
    status: entity.status,
  });
}
