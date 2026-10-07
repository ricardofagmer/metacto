import { DecisionBrief } from '@fis/shared';

/**
 * The only brief fields a stakeholder draft may be written from. `decidedBy` (an actor name) and
 * the timestamps are deliberately absent: a personal name has no business reaching a model
 * provider or a stored draft, and an allowlist means a field added to DecisionBrief later stays
 * out until someone opts it in here.
 */
export type StakeholderBriefView = Pick<DecisionBrief, 'status' | 'recommendation' | 'evidence' | 'risks' | 'openQuestions' | 'decisionNote'>;

export function toStakeholderBriefView(brief: DecisionBrief): StakeholderBriefView {
  return {
    status: brief.status,
    recommendation: brief.recommendation,
    evidence: brief.evidence,
    risks: brief.risks,
    openQuestions: brief.openQuestions,
    decisionNote: brief.decisionNote,
  };
}
