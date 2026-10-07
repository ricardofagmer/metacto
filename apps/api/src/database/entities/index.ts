import { AnalysisEntity } from './analysis.entity';
import { DecisionBriefEntity } from './decision-brief.entity';
import { FeatureRequestDecisionEntity, FeatureRequestDecisionKind } from './feature-request-decision.entity';
import { FeatureRequestEntity } from './feature-request.entity';
import { StakeholderDraftEntity } from './stakeholder-draft.entity';
import { ThemeMemberEntity } from './theme-member.entity';
import { ThemeEntity } from './theme.entity';
import { VoteEntity } from './vote.entity';

export type { FeatureRequestDecisionKind };
export {
  AnalysisEntity,
  DecisionBriefEntity,
  FeatureRequestDecisionEntity,
  FeatureRequestEntity,
  StakeholderDraftEntity,
  ThemeEntity,
  ThemeMemberEntity,
  VoteEntity,
};

export const ENTITIES = [
  FeatureRequestEntity,
  VoteEntity,
  AnalysisEntity,
  ThemeEntity,
  ThemeMemberEntity,
  DecisionBriefEntity,
  StakeholderDraftEntity,
  FeatureRequestDecisionEntity,
];
