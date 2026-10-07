import type { Audience, FeatureRequestSort, FeatureRequestStatus, ScoringCriterion } from '@fis/shared';

export const STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  planned: 'Planned',
  declined: 'Declined',
  merged: 'Merged',
};

export const SORT_LABELS: Record<FeatureRequestSort, string> = {
  votes: 'Most votes',
  priority: 'Highest priority',
  recent: 'Most recent',
};

export const CRITERION_LABELS: Record<ScoringCriterion, string> = {
  reach: 'Reach',
  impact: 'Impact',
  strategicFit: 'Strategic fit',
  effortInverse: 'Ease (inverse effort)',
  demand: 'Demand',
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  requesters: 'Requesters',
  leadership: 'Leadership',
  engineering: 'Engineering',
};

const PERCENT = 100;

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * PERCENT)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));
}
