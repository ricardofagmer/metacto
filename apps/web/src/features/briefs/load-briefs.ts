import type { BriefSubject, DecisionBrief, StakeholderDraft } from '@fis/shared';
import { listBriefs, listStakeholderDrafts, type ApiFailure } from '@/lib/api';
import { mapWithConcurrency } from '@/lib/concurrency';

// Plain data so it can be handed from the server page to the client BriefPanel.
export type StoredBrief = {
  brief: DecisionBrief | null;
  briefFailure: ApiFailure | null;
  drafts: StakeholderDraft[];
  draftsFailure: ApiFailure | null;
};

const EMPTY_STORED_BRIEF: StoredBrief = { brief: null, briefFailure: null, drafts: [], draftsFailure: null };

// Caps parallel reads against the API when a page renders one panel per row.
const BRIEF_READ_CONCURRENCY = 5;

export type StoredBriefLookup = (subject: BriefSubject) => StoredBrief;

function subjectKey(subject: BriefSubject): string {
  return 'themeId' in subject ? `theme:${subject.themeId}` : `request:${subject.featureRequestId}`;
}

function newestFirst<Entity extends { createdAt: string }>(left: Entity, right: Entity): number {
  return right.createdAt.localeCompare(left.createdAt);
}

// A brief may be redrafted per audience; the panel edits only the most recent draft for each.
function latestDraftPerAudience(drafts: StakeholderDraft[]): StakeholderDraft[] {
  const latest = new Map<StakeholderDraft['audience'], StakeholderDraft>();
  [...drafts].sort(newestFirst).forEach((draft) => {
    if (!latest.has(draft.audience)) latest.set(draft.audience, draft);
  });
  return Array.from(latest.values());
}

async function loadStoredBrief(subject: BriefSubject): Promise<StoredBrief> {
  const briefs = await listBriefs(subject);
  if (!briefs.ok) return { ...EMPTY_STORED_BRIEF, briefFailure: briefs.error };
  const brief = [...briefs.data.items].sort(newestFirst)[0] ?? null;
  if (brief === null || brief.status !== 'approved') return { ...EMPTY_STORED_BRIEF, brief };

  const drafts = await listStakeholderDrafts(brief.id);
  if (!drafts.ok) return { ...EMPTY_STORED_BRIEF, brief, draftsFailure: drafts.error };
  return { ...EMPTY_STORED_BRIEF, brief, drafts: latestDraftPerAudience(drafts.data.items) };
}

// Server-side read-back so generated briefs, decisions and drafts survive a reload.
export async function loadStoredBriefs(subjects: BriefSubject[]): Promise<StoredBriefLookup> {
  const stored = await mapWithConcurrency({ items: subjects, limit: BRIEF_READ_CONCURRENCY, mapper: loadStoredBrief });
  const bySubject = new Map(subjects.map((subject, index) => [subjectKey(subject), stored[index] ?? EMPTY_STORED_BRIEF]));
  return (subject) => bySubject.get(subjectKey(subject)) ?? EMPTY_STORED_BRIEF;
}
