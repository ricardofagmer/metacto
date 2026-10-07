import { z } from 'zod';
import { AnalyzeModelOutput, BriefModelOutput, ClusterModelOutput, DuplicatesModelOutput, PriorityModelOutput, StakeholderModelOutput } from './model-output.schemas';

export type StructuredTool<Schema extends z.AnyZodObject> = {
  name: string;
  description: string;
  schema: Schema;
};

// One side-effect-free function declaration per capability (ADR 0006): it exists only to carry
// structured output, and the call is forced, so the model cannot answer in prose instead.
export const GEMINI_TOOLS = {
  findDuplicates: {
    name: 'record_duplicate_candidates',
    description: 'Record which candidate requests duplicate the target request. Has no side effects.',
    schema: DuplicatesModelOutput,
  },
  analyze: {
    name: 'record_request_analysis',
    description: 'Record the underlying need, duplicate candidates and criterion scores for the target request. Has no side effects.',
    schema: AnalyzeModelOutput,
  },
  scorePriority: {
    name: 'record_priority_scores',
    description: 'Record the four judgement criterion scores and the rationale. Has no side effects.',
    schema: PriorityModelOutput,
  },
  cluster: {
    name: 'record_themes',
    description: 'Record the themes the requests were grouped into. Has no side effects.',
    schema: ClusterModelOutput,
  },
  draftBrief: {
    name: 'record_decision_brief',
    description: 'Record the drafted decision brief. Has no side effects.',
    schema: BriefModelOutput,
  },
  draftStakeholderMessage: {
    name: 'record_stakeholder_message',
    description: 'Record the drafted stakeholder message body. Has no side effects.',
    schema: StakeholderModelOutput,
  },
} as const satisfies Record<string, StructuredTool<z.AnyZodObject>>;

// Per-capability output ceilings (spec: 1024..4096); clustering lists every ref, so it gets the most.
// On Gemini thinking tokens count against this ceiling too, which is why the caller caps thinking.
export const MAX_OUTPUT_TOKENS = {
  findDuplicates: 2048,
  analyze: 3072,
  scorePriority: 2048,
  cluster: 4096,
  draftBrief: 4096,
  draftStakeholderMessage: 4096,
} as const;
