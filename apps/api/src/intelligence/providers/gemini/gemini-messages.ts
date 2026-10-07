import { Analysis, RequestSummary, SCORING_WEIGHTS, Theme } from '@fis/shared';
import { CORPUS_DESCRIPTION_MAX_LENGTH, RequestRefs, RequestText, escapeData, renderRequestBlock, renderTaggedData } from '../../prompts/prompt-data';
import { StakeholderBriefView } from '../../prompts/stakeholder-brief.mapper';

/**
 * User-message builders. Every piece of user-authored or model-derived text goes through
 * renderRequestBlock / renderTaggedData, so it is escaped and sits inside a data tag (ADR 0006).
 */
const CLUSTER_DESCRIPTION_MAX_LENGTH = 300;
const NEED_EXCERPT_MAX_LENGTH = 400;

export function describeWeights(): string {
  return Object.entries(SCORING_WEIGHTS)
    .map(([criterion, weight]) => `${criterion} ${weight}`)
    .join(', ');
}

function corpusBlocks(corpus: RequestSummary[], refs: RequestRefs, descriptionMaxLength: number): string {
  return corpus
    .map((entry) => renderRequestBlock({ ref: refs.refOf(entry.id), request: entry, summary: entry, descriptionMaxLength }))
    .join('\n');
}

export type CandidateMessageInput = {
  task: string;
  target: RequestText;
  candidates: RequestSummary[];
  refs: RequestRefs;
};

export function buildCandidateMessage(input: CandidateMessageInput): string {
  return [
    input.task,
    '<target>',
    renderRequestBlock({ ref: 'target', request: input.target }),
    '</target>',
    '<candidates>',
    corpusBlocks(input.candidates, input.refs, CORPUS_DESCRIPTION_MAX_LENGTH),
    '</candidates>',
  ].join('\n');
}

export type ScoreMessageInput = {
  task: string;
  request: RequestSummary;
  underlyingNeed: string;
  maxVoteCount: number;
  corpusSize: number;
};

export function buildScoreMessage(input: ScoreMessageInput): string {
  return [
    input.task,
    renderRequestBlock({ ref: 'target', request: input.request, summary: input.request }),
    renderTaggedData('underlying_need', input.underlyingNeed),
    `<vote_context votes="${input.request.voteCount}" max_votes="${input.maxVoteCount}" corpus_size="${input.corpusSize}" />`,
  ].join('\n');
}

export function buildClusterMessage(task: string, requests: RequestSummary[], refs: RequestRefs): string {
  return [task, '<requests>', corpusBlocks(requests, refs, CLUSTER_DESCRIPTION_MAX_LENGTH), '</requests>'].join('\n');
}

export type BriefMessageInput = {
  task: string;
  requests: RequestSummary[];
  analyses: Analysis[];
  theme?: Theme | undefined;
  refs: RequestRefs;
};

export function buildBriefMessage(input: BriefMessageInput): string {
  const analyses = input.analyses.map(
    (analysis) =>
      `<analysis ref="${input.refs.refOf(analysis.featureRequestId)}" priority_score="${analysis.priority.score}" provider="${analysis.provider}">${escapeData(analysis.underlyingNeed.slice(0, NEED_EXCERPT_MAX_LENGTH))}</analysis>`,
  );
  const theme = input.theme !== undefined ? [`<theme>`, renderTaggedData('name', input.theme.name), renderTaggedData('summary', input.theme.summary), `</theme>`] : [];
  return [input.task, ...theme, '<requests>', corpusBlocks(input.requests, input.refs, CORPUS_DESCRIPTION_MAX_LENGTH), '</requests>', ...analyses].join('\n');
}

export type StakeholderMessageInput = {
  task: string;
  // A view, not the DecisionBrief: who decided never reaches the model (see the mapper).
  brief: StakeholderBriefView;
  requests: RequestSummary[];
  refs: RequestRefs;
};

function listBlock(tag: string, items: string[]): string {
  return [`<${tag}>`, ...items.map((entry) => renderTaggedData('item', entry)), `</${tag}>`].join('\n');
}

export function buildStakeholderMessage(input: StakeholderMessageInput): string {
  const brief = input.brief;
  return [
    input.task,
    `<brief status="${brief.status}">`,
    renderTaggedData('recommendation', brief.recommendation),
    listBlock('evidence', brief.evidence),
    listBlock('risks', brief.risks),
    listBlock('open_questions', brief.openQuestions),
    renderTaggedData('decision_note', brief.decisionNote ?? ''),
    '</brief>',
    '<requests>',
    corpusBlocks(input.requests, input.refs, CORPUS_DESCRIPTION_MAX_LENGTH),
    '</requests>',
  ].join('\n');
}
