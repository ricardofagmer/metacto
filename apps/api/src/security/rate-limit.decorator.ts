import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const STRICT_RATE_LIMIT_KEY = 'fis:strict-rate-limit';

// Marks handlers that write or spend AI calls; they get the strict per-IP budget on top of the global one.
export const StrictRateLimit = (): CustomDecorator<string> => SetMetadata(STRICT_RATE_LIMIT_KEY, true);
