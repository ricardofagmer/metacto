// Code-side pin for every prompt file in apps/api/prompts/. The loader refuses a file whose
// header disagrees, so a prompt edit without a version bump (and its eval run) fails at boot.
export const PROMPT_VERSIONS = {
  analyze: 'analyze@1',
  dedupe: 'dedupe@1',
  cluster: 'cluster@1',
  score: 'score@1',
  brief: 'brief@1',
  stakeholder: 'stakeholder@2',
} as const;

export type PromptId = keyof typeof PROMPT_VERSIONS;
