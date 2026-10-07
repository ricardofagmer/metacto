import { ACTOR_NAME_MAX_LENGTH, AUTHOR_NAME_MAX_LENGTH, THEME_NAME_MAX_LENGTH, TITLE_MAX_LENGTH, VOTER_KEY_MAX_LENGTH } from '@fis/shared';

// Column widths derive from the shared contract limits so the schema can never be narrower than what validation accepts.
export const UUID_LENGTH = 36;
export const ISO_TIMESTAMP_LENGTH = 32;
export const ENUM_LENGTH = 20;
export const PROMPT_VERSION_LENGTH = 40;
export const MODEL_LENGTH = 100;
export const COLUMN_SIZES = {
  title: TITLE_MAX_LENGTH,
  authorName: AUTHOR_NAME_MAX_LENGTH,
  actorName: ACTOR_NAME_MAX_LENGTH,
  themeName: THEME_NAME_MAX_LENGTH,
  voterKey: VOTER_KEY_MAX_LENGTH,
} as const;
