import { MAX_DUPLICATE_CANDIDATES } from '@fis/shared';
import { getFeatureRequest } from '@/lib/api';

// Bounded fan-out: related ids beyond the cap render without a title rather than issuing unbounded reads.
export async function loadRequestTitles(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids)).slice(0, MAX_DUPLICATE_CANDIDATES);
  const results = await Promise.all(unique.map((id) => getFeatureRequest(id)));
  const titles = new Map<string, string>();
  results.forEach((result) => {
    if (result.ok) titles.set(result.data.request.id, result.data.request.title);
  });
  return titles;
}
