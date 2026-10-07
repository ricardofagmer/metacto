import { z } from 'zod';

export const Id = z.string().uuid();
export type Id = z.infer<typeof Id>;

export const IsoDateTime = z.string().datetime();
export type IsoDateTime = z.infer<typeof IsoDateTime>;

export const Provider = z.enum(['anthropic', 'heuristic']);
export type Provider = z.infer<typeof Provider>;

export const ACTOR_NAME_MAX_LENGTH = 80;
export const NOTE_MAX_LENGTH = 1000;

// Free-text display name of the human who decided; auth is out of scope (ADR 0005), so it is not an identity.
export const ActorName = z.string().trim().min(1).max(ACTOR_NAME_MAX_LENGTH);
export type ActorName = z.infer<typeof ActorName>;

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Query strings arrive as text, so values are coerced before range checks.
// Bounds the OFFSET so a huge page cannot reach the database as a 500.
export const MAX_PAGE = 10_000;

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export type PaginatedSchema<Item extends z.ZodTypeAny> = z.ZodObject<{
  items: z.ZodArray<Item>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  limit: z.ZodNumber;
}>;

export function paginated<Item extends z.ZodTypeAny>(item: Item): PaginatedSchema<Item> {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(MAX_PAGE_LIMIT),
  });
}
export type Paginated<Item> = {
  items: Item[];
  total: number;
  page: number;
  limit: number;
};
