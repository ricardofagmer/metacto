import {
  Analysis,
  Audience,
  BRIEF_LIST_ITEM_MAX_LENGTH,
  BRIEF_LIST_MAX_ITEMS,
  DRAFT_BODY_MAX_LENGTH,
  RECOMMENDATION_MAX_LENGTH,
  RequestSummary,
  Theme,
} from '@fis/shared';
import { StakeholderBriefView } from '../../prompts/stakeholder-brief.mapper';

export type BriefDraft = {
  recommendation: string;
  evidence: string[];
  risks: string[];
  openQuestions: string[];
};

export type BriefTemplateInput = {
  requests: RequestSummary[];
  analyses: Analysis[];
  theme?: Theme | undefined;
};

export type StakeholderTemplateInput = {
  brief: StakeholderBriefView;
  audience: Audience;
  requests: RequestSummary[];
};

const EVIDENCE_REQUEST_COUNT = 5;
const LOW_DEMAND_VOTES = 3;
const LOW_EFFORT_INVERSE = 40;
const NEED_EXCERPT_LENGTH = 200;
const TEMPLATE_NOTE = 'Drafted from a template by the heuristic provider, not by a language model.';

function item(text: string): string {
  return text.slice(0, BRIEF_LIST_ITEM_MAX_LENGTH);
}

function byVotes(requests: RequestSummary[]): RequestSummary[] {
  return [...requests].sort((left, right) => right.voteCount - left.voteCount || left.title.localeCompare(right.title));
}

export function draftBriefFromTemplate(input: BriefTemplateInput): BriefDraft {
  const analysisById = new Map(input.analyses.map((analysis) => [analysis.featureRequestId, analysis]));
  const ranked = byVotes(input.requests);
  const totalVotes = ranked.reduce((total, request) => total + request.voteCount, 0);
  const top = ranked[0];
  const subjectLabel = input.theme !== undefined ? `theme "${input.theme.name}"` : `request "${top?.title ?? 'unknown'}"`;
  const scored = ranked.filter((request) => analysisById.has(request.id));
  const highest = [...scored].sort((left, right) => (analysisById.get(right.id)?.priority.score ?? 0) - (analysisById.get(left.id)?.priority.score ?? 0))[0];
  const highestLine = highest !== undefined ? ` Highest priority score: "${highest.title}" at ${analysisById.get(highest.id)?.priority.score ?? 0}.` : ' No request in scope has been analysed yet.';
  const recommendation = `Review ${subjectLabel}: ${ranked.length} request(s), ${totalVotes} vote(s).${highestLine} Next step: confirm the underlying need with the top requesters before committing scope. ${TEMPLATE_NOTE}`;

  const evidence = ranked.slice(0, EVIDENCE_REQUEST_COUNT).map((request) => {
    const analysis = analysisById.get(request.id);
    const need = analysis !== undefined ? `; need: ${analysis.underlyingNeed.slice(0, NEED_EXCERPT_LENGTH)}` : '; not analysed';
    const score = analysis !== undefined ? `; priority ${analysis.priority.score}` : '';
    return item(`"${request.title}" - ${request.voteCount} vote(s), status ${request.status}${score}${need}`);
  });

  const risks: string[] = [];
  if (totalVotes <= LOW_DEMAND_VOTES) {
    risks.push(item(`Low demand signal: only ${totalVotes} vote(s) across the scope.`));
  }
  const expensive = scored.filter((request) => (analysisById.get(request.id)?.priority.breakdown.effortInverse ?? 100) < LOW_EFFORT_INVERSE);
  if (expensive.length > 0) {
    risks.push(item(`Keyword rules flag high effort for: ${expensive.map((request) => `"${request.title}"`).join(', ')}.`));
  }
  const unanalysed = ranked.length - scored.length;
  if (unanalysed > 0) {
    risks.push(item(`${unanalysed} request(s) have no analysis, so their priority is unknown.`));
  }
  risks.push(item('Template risks are generic; a product owner should add domain-specific risks.'));

  const openQuestions = [
    item('Which customer segment raised these requests, and is it a strategic segment?'),
    item('What is the smallest change that would satisfy the most-voted request?'),
    item('Are any of these requests duplicates that should be merged before deciding?'),
  ];

  return {
    recommendation: recommendation.slice(0, RECOMMENDATION_MAX_LENGTH),
    evidence: evidence.slice(0, BRIEF_LIST_MAX_ITEMS),
    risks: risks.slice(0, BRIEF_LIST_MAX_ITEMS),
    openQuestions,
  };
}

const AUDIENCE_OPENINGS: Record<Audience, string> = {
  requesters: 'Thank you for your feature requests. Here is an update on what we decided.',
  leadership: 'Summary of a product decision for leadership review.',
  engineering: 'Heads-up for engineering on a product decision and its scope.',
};

const AUDIENCE_CLOSINGS: Record<Audience, string> = {
  requesters: 'We will keep you posted as this moves forward. Keep voting on the requests that matter to you.',
  leadership: 'Open questions are listed above; reply with any concerns before planning starts.',
  engineering: 'Please flag effort or dependency concerns on the open questions before sizing.',
};

function bulletList(items: string[]): string {
  return items.length > 0 ? items.map((entry) => `- ${entry}`).join('\n') : '- none recorded';
}

export function draftStakeholderFromTemplate(input: StakeholderTemplateInput): string {
  const decision = input.brief.status === 'draft' ? 'is still under review' : `was ${input.brief.status}`;
  const note = input.brief.decisionNote !== undefined && input.brief.decisionNote.length > 0 ? `\nDecision note: ${input.brief.decisionNote}` : '';
  const titles = byVotes(input.requests).slice(0, EVIDENCE_REQUEST_COUNT).map((request) => `"${request.title}" (${request.voteCount} votes)`);
  const sections = [
    AUDIENCE_OPENINGS[input.audience],
    `Decision: the recommendation ${decision}.${note}`,
    `Recommendation:\n${input.brief.recommendation}`,
    `Requests covered:\n${bulletList(titles)}`,
  ];
  if (input.audience !== 'requesters') {
    sections.push(`Risks:\n${bulletList(input.brief.risks)}`, `Open questions:\n${bulletList(input.brief.openQuestions)}`);
  }
  sections.push(AUDIENCE_CLOSINGS[input.audience], TEMPLATE_NOTE);
  return sections.join('\n\n').slice(0, DRAFT_BODY_MAX_LENGTH);
}
