import { z } from 'zod';
import { Id, IsoDateTime } from './common';

export const VOTER_KEY_MIN_LENGTH = 8;
export const VOTER_KEY_MAX_LENGTH = 64;

// Anonymous browser id from localStorage (ADR 0005); not a credential.
export const VoterKey = z.string().min(VOTER_KEY_MIN_LENGTH).max(VOTER_KEY_MAX_LENGTH);
export type VoterKey = z.infer<typeof VoterKey>;

// (featureRequestId, voterKey) is unique; enforced by a database constraint because zod cannot express it.
export const Vote = z.object({
  id: Id,
  featureRequestId: Id,
  voterKey: VoterKey,
  createdAt: IsoDateTime,
});
export type Vote = z.infer<typeof Vote>;
