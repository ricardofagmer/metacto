// The heuristic path has no prompt, so `promptVersion` names the algorithm revision instead.
// Bump the suffix whenever a rule, threshold or template changes, and re-run the golden set.
export const HEURISTIC_VERSIONS = {
  analyze: 'heuristic-analyze@2',
  findDuplicates: 'heuristic-dedupe@2',
  cluster: 'heuristic-cluster@1',
  scorePriority: 'heuristic-score@1',
  draftBrief: 'heuristic-brief@1',
  draftStakeholderMessage: 'heuristic-stakeholder@2',
} as const;
