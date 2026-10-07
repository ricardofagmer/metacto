import { FeatureRequestStatus, MAX_CORPUS_SIZE } from '@fis/shared';
import { FeatureRequestDecisionKind } from '../database/entities';

export const FEATURE_REQUEST_RESOURCE = 'Feature request';
export const CORPUS_LIMIT = MAX_CORPUS_SIZE;
export const MERGED_STATUS = FeatureRequestStatus.enum.merged;
export const INITIAL_STATUS = FeatureRequestStatus.enum.open;
export const MERGE_DECISION_KIND: FeatureRequestDecisionKind = 'merge';
export const STATUS_DECISION_KIND: FeatureRequestDecisionKind = 'status';
