import { z } from 'zod';
import { Id, IsoDateTime } from './common';

export const FeatureRequestStatus = z.enum(['open', 'under_review', 'planned', 'declined', 'merged']);
export type FeatureRequestStatus = z.infer<typeof FeatureRequestStatus>;

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 4000;
export const AUTHOR_NAME_MAX_LENGTH = 80;

// Unrefined object shape: `.pick`/`.omit`/`.extend` are unavailable on a refined schema.
export const FeatureRequestFields = z.object({
  id: Id,
  title: z.string().trim().min(TITLE_MIN_LENGTH).max(TITLE_MAX_LENGTH),
  description: z.string().trim().min(DESCRIPTION_MIN_LENGTH).max(DESCRIPTION_MAX_LENGTH),
  authorName: z.string().trim().min(1).max(AUTHOR_NAME_MAX_LENGTH),
  status: FeatureRequestStatus,
  mergedIntoId: Id.optional(),
  themeId: Id.optional(),
  voteCount: z.number().int().min(0),
  createdAt: IsoDateTime,
});

type MergeLinkFields = Pick<z.infer<typeof FeatureRequestFields>, 'status' | 'mergedIntoId'>;

export function refineMergeLink(value: MergeLinkFields, context: z.RefinementCtx): void {
  const isMerged = value.status === 'merged';
  const hasTarget = value.mergedIntoId !== undefined;
  if (isMerged !== hasTarget) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mergedIntoId'],
      message: "mergedIntoId must be present if and only if status is 'merged'",
    });
  }
}

export const FeatureRequest = FeatureRequestFields.superRefine(refineMergeLink);
export type FeatureRequest = z.infer<typeof FeatureRequest>;
