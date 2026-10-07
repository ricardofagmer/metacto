import { FeatureRequestSort, FeatureRequestStatus, SEARCH_QUERY_MAX_LENGTH, type Theme } from '@fis/shared';
import { Button, ButtonLink } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/fields';
import { SORT_LABELS, STATUS_LABELS } from '@/lib/labels';
import type { DiscoverParams } from './discover-params';

const ANY_VALUE = '';

type FilterBarProps = { params: DiscoverParams; themes: Theme[] };

// A plain GET form: filters live in the URL, work without JavaScript, and are shareable.
export function FilterBar({ params, themes }: FilterBarProps) {
  const statusOptions = [
    { value: ANY_VALUE, label: 'Any status' },
    ...FeatureRequestStatus.options.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
  ];
  const themeOptions = [{ value: ANY_VALUE, label: 'Any theme' }, ...themes.map((theme) => ({ value: theme.id, label: theme.name }))];
  const sortOptions = FeatureRequestSort.options.map((sort) => ({ value: sort, label: SORT_LABELS[sort] }));

  return (
    <form method="get" action="/" role="search" aria-label="Filter feature requests" className="mb-6 rounded-card border border-border bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <TextField
          id="filter-q"
          name="q"
          type="search"
          label="Search"
          placeholder="Search titles and descriptions"
          defaultValue={params.q ?? ''}
          maxLength={SEARCH_QUERY_MAX_LENGTH}
        />
        <SelectField id="filter-status" name="status" label="Status" options={statusOptions} defaultValue={params.status ?? ANY_VALUE} />
        <SelectField id="filter-theme" name="themeId" label="Theme" options={themeOptions} defaultValue={params.themeId ?? ANY_VALUE} />
        <SelectField id="filter-sort" name="sort" label="Sort by" options={sortOptions} defaultValue={params.sort} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit">Apply filters</Button>
        <ButtonLink href="/" variant="ghost">
          Reset
        </ButtonLink>
      </div>
    </form>
  );
}
