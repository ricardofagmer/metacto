import { PRIORITY_MAX, PRIORITY_MIN } from '@fis/shared';

const PERCENT = 100;

// Both providers use this: demand is arithmetic over votes (spec resolved question 5), so no
// provider, and no model, guesses it.
export function demandFromVotes(voteCount: number, maxVoteCount: number): number {
  if (maxVoteCount <= 0) {
    return PRIORITY_MIN;
  }
  return Math.round(Math.min(PRIORITY_MAX, Math.max(PRIORITY_MIN, (voteCount / maxVoteCount) * PERCENT)));
}
