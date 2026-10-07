import type { Theme } from '@fis/shared';
import Link from 'next/link';
import { ProviderBadge } from '@/components/ui/provenance';
import { BriefPanel } from '@/features/briefs/brief-panel';
import type { StoredBrief } from '@/features/briefs/load-briefs';

type ThemeCardProps = { theme: Theme; stored: StoredBrief };

export function ThemeCard({ theme, stored }: ThemeCardProps) {
  const headingId = `theme-${theme.id}`;
  const memberCount = theme.requestIds.length;
  return (
    <li>
      <article aria-labelledby={headingId} className="space-y-3 rounded-card border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id={headingId} className="text-base font-semibold text-fg">
            {theme.name}
          </h2>
          <ProviderBadge provider={theme.provider} />
        </div>
        <p className="text-sm text-fg">{theme.summary}</p>
        <p className="text-sm text-fg-muted">
          <Link href={`/?themeId=${theme.id}`} className="font-medium text-accent hover:underline">
            {memberCount} {memberCount === 1 ? 'request' : 'requests'}
          </Link>{' '}
          in this theme
        </p>
        <BriefPanel subject={{ themeId: theme.id }} stored={stored} />
      </article>
    </li>
  );
}
