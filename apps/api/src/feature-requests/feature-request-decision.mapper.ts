import { FeatureRequestDecisionEntity, FeatureRequestDecisionKind } from '../database/entities';

export type NewFeatureRequestDecision = {
  id: string;
  featureRequestId: string;
  kind: FeatureRequestDecisionKind;
  decidedBy: string;
  note: string | null;
  createdAt: string;
};

export function toFeatureRequestDecisionEntity(decision: NewFeatureRequestDecision): FeatureRequestDecisionEntity {
  const entity = new FeatureRequestDecisionEntity();
  entity.id = decision.id;
  entity.featureRequestId = decision.featureRequestId;
  entity.kind = decision.kind;
  entity.decidedBy = decision.decidedBy;
  entity.note = decision.note;
  entity.createdAt = decision.createdAt;
  return entity;
}
