import { z } from 'zod';
import { ActorName, Id, IsoDateTime, NOTE_MAX_LENGTH, Provider } from './common';

export const RECOMMENDATION_MAX_LENGTH = 2000;
export const BRIEF_LIST_MAX_ITEMS = 20;
export const BRIEF_LIST_ITEM_MAX_LENGTH = 1000;
export const DRAFT_BODY_MAX_LENGTH = 5000;

const briefListItem = z.string().min(1).max(BRIEF_LIST_ITEM_MAX_LENGTH);

export const BriefStatus = z.enum(['draft', 'approved', 'rejected']);
export type BriefStatus = z.infer<typeof BriefStatus>;

// Strict members make the union reject a body carrying both ids, so exactly one subject is accepted.
export const BriefSubject = z.union([
  z.object({ themeId: Id }).strict(),
  z.object({ featureRequestId: Id }).strict(),
]);
export type BriefSubject = z.infer<typeof BriefSubject>;

// Unrefined object shape, reused by the IntelligenceService port output.
export const DecisionBriefFields = z.object({
  id: Id,
  themeId: Id.optional(),
  featureRequestId: Id.optional(),
  recommendation: z.string().min(1).max(RECOMMENDATION_MAX_LENGTH),
  evidence: z.array(briefListItem).max(BRIEF_LIST_MAX_ITEMS),
  risks: z.array(briefListItem).max(BRIEF_LIST_MAX_ITEMS),
  openQuestions: z.array(briefListItem).max(BRIEF_LIST_MAX_ITEMS),
  provider: Provider,
  model: z.string().min(1).optional(),
  promptVersion: z.string().min(1),
  status: BriefStatus,
  decidedBy: ActorName.optional(),
  decidedAt: IsoDateTime.optional(),
  decisionNote: z.string().max(NOTE_MAX_LENGTH).optional(),
  createdAt: IsoDateTime,
});

export const DecisionBrief = DecisionBriefFields.superRefine((brief, context) => {
  const hasTheme = brief.themeId !== undefined;
  const hasRequest = brief.featureRequestId !== undefined;
  if (hasTheme === hasRequest) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['themeId'],
      message: 'exactly one of themeId and featureRequestId must be present',
    });
  }
  const isDecided = brief.status !== 'draft';
  if (isDecided && (brief.decidedBy === undefined || brief.decidedAt === undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['decidedBy'],
      message: 'a decided brief must carry decidedBy and decidedAt',
    });
  }
});
export type DecisionBrief = z.infer<typeof DecisionBrief>;

export const Audience = z.enum(['requesters', 'leadership', 'engineering']);
export type Audience = z.infer<typeof Audience>;

export const DraftStatus = z.enum(['draft', 'approved']);
export type DraftStatus = z.infer<typeof DraftStatus>;

export const DraftBody = z.string().min(1).max(DRAFT_BODY_MAX_LENGTH);
export type DraftBody = z.infer<typeof DraftBody>;

export const StakeholderDraft = z.object({
  id: Id,
  briefId: Id,
  audience: Audience,
  body: DraftBody,
  provider: Provider,
  model: z.string().min(1).optional(),
  promptVersion: z.string().min(1),
  status: DraftStatus,
  updatedBy: ActorName.optional(),
  updatedAt: IsoDateTime,
  createdAt: IsoDateTime,
});
export type StakeholderDraft = z.infer<typeof StakeholderDraft>;
