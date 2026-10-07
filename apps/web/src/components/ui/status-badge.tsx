import type { FeatureRequestStatus } from '@fis/shared';
import { STATUS_LABELS } from '@/lib/labels';
import { Badge, type BadgeTone } from './badge';

const STATUS_TONES: Record<FeatureRequestStatus, BadgeTone> = {
  open: 'accent',
  under_review: 'warning',
  planned: 'success',
  declined: 'danger',
  merged: 'neutral',
};

export function StatusBadge({ status }: { status: FeatureRequestStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
