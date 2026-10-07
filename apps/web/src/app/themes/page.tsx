import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { AiExplainer } from '@/components/ui/provenance';
import { RetryButton } from '@/components/ui/retry-button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { listThemes } from '@/lib/api';
import { loadStoredBriefs } from '@/features/briefs/load-briefs';
import { ReclusterButton } from '@/features/themes/recluster-button';
import { ThemeCard } from '@/features/themes/theme-card';

export const metadata: Metadata = { title: 'Themes' };

export default async function ThemesPage() {
  const result = await listThemes();
  const storedBriefFor = await loadStoredBriefs(result.ok ? result.data.items.map((theme) => ({ themeId: theme.id })) : []);
  return (
    <>
      <PageHeader
        title="Themes"
        description="Requests grouped by the problem they share. Clustering groups requests; it never changes their status."
        actions={<ReclusterButton />}
      />
      <div className="mb-4">
        <AiExplainer />
      </div>
      {!result.ok ? (
        <ErrorState title="Themes could not be loaded" failure={result.error} action={<RetryButton />} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          title="No themes yet"
          description="Run clustering to group open requests into themes. At least two open requests are needed."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {result.data.items.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} stored={storedBriefFor({ themeId: theme.id })} />
          ))}
        </ul>
      )}
    </>
  );
}
