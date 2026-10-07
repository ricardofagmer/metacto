import { BriefSubject, DecisionBrief, DraftBriefOutput } from '@fis/shared';
import { DomainError } from '../common/domain-errors';
import { DecisionBriefEntity } from '../database/entities';

export function toDecisionBrief(entity: DecisionBriefEntity): DecisionBrief {
  return DecisionBrief.parse({
    id: entity.id,
    themeId: entity.themeId ?? undefined,
    featureRequestId: entity.featureRequestId ?? undefined,
    recommendation: entity.recommendation,
    evidence: entity.evidence,
    risks: entity.risks,
    openQuestions: entity.openQuestions,
    provider: entity.provider,
    model: entity.model ?? undefined,
    promptVersion: entity.promptVersion,
    status: entity.status,
    decidedBy: entity.decidedBy ?? undefined,
    decidedAt: entity.decidedAt ?? undefined,
    decisionNote: entity.decisionNote ?? undefined,
    createdAt: entity.createdAt,
  });
}

// Who decided is not needed to write the message, so the actor name never reaches a model provider.
export function toModelSafeBrief(entity: DecisionBriefEntity): DecisionBrief {
  const { decidedBy: _decidedBy, ...brief } = toDecisionBrief(entity);
  return brief;
}

export type NewBriefFields = { id: string; subject: BriefSubject; output: DraftBriefOutput; createdAt: string };

// Every brief starts undecided: only PATCH /briefs/:id/decision moves it (ADR 0004).
export function toNewBriefEntity(fields: NewBriefFields): DecisionBriefEntity {
  const entity = new DecisionBriefEntity();
  entity.id = fields.id;
  entity.themeId = 'themeId' in fields.subject ? fields.subject.themeId : null;
  entity.featureRequestId = 'featureRequestId' in fields.subject ? fields.subject.featureRequestId : null;
  entity.recommendation = fields.output.recommendation;
  entity.evidence = fields.output.evidence;
  entity.risks = fields.output.risks;
  entity.openQuestions = fields.output.openQuestions;
  entity.provider = fields.output.provider;
  entity.model = fields.output.model ?? null;
  entity.promptVersion = fields.output.promptVersion;
  entity.status = 'draft';
  entity.decidedBy = null;
  entity.decidedAt = null;
  entity.decisionNote = null;
  entity.createdAt = fields.createdAt;
  return entity;
}

// The database check constraint guarantees exactly one subject; reaching the throw means the row was corrupted.
export function toBriefSubject(entity: DecisionBriefEntity): BriefSubject {
  if (entity.themeId !== null) {
    return { themeId: entity.themeId };
  }
  if (entity.featureRequestId !== null) {
    return { featureRequestId: entity.featureRequestId };
  }
  throw new DomainError('internal', `Decision brief ${entity.id} has no subject`);
}
