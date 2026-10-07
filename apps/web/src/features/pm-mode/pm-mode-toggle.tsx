'use client';

import { ACTOR_NAME_MAX_LENGTH } from '@fis/shared';
import { updatePmMode, usePmMode } from './pm-mode-store';

export function PmModeToggle() {
  const mode = usePmMode();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-fg">
        <input
          type="checkbox"
          role="switch"
          aria-checked={mode.enabled}
          checked={mode.enabled}
          onChange={(event) => updatePmMode({ enabled: event.target.checked })}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        PM mode
      </label>
      {mode.enabled ? (
        <div className="flex items-center gap-2">
          <label htmlFor="pm-acting-as" className="text-sm text-fg-muted">
            Acting as
          </label>
          <input
            id="pm-acting-as"
            type="text"
            value={mode.actingAs}
            maxLength={ACTOR_NAME_MAX_LENGTH}
            placeholder="Your name"
            autoComplete="name"
            onChange={(event) => updatePmMode({ actingAs: event.target.value })}
            className="w-36 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-fg placeholder:text-fg-muted"
          />
        </div>
      ) : null}
    </div>
  );
}
