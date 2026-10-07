import { z } from 'zod';
import { Id, Provider } from './common';

export const THEME_NAME_MAX_LENGTH = 80;
export const THEME_SUMMARY_MAX_LENGTH = 1000;

// requestIds has at least one member: themes left without members after re-clustering are hidden, never returned.
export const Theme = z.object({
  id: Id,
  name: z.string().min(1).max(THEME_NAME_MAX_LENGTH),
  summary: z.string().min(1).max(THEME_SUMMARY_MAX_LENGTH),
  requestIds: z.array(Id).min(1),
  provider: Provider,
});
export type Theme = z.infer<typeof Theme>;
