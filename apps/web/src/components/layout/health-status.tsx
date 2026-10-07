import { getHealth } from '@/lib/api';
import { summarizeFailure } from '@/lib/failure';
import { Badge } from '@/components/ui/badge';
import { providerLabel } from '@/components/ui/provenance';

export async function HealthStatus() {
  const result = await getHealth();
  if (!result.ok) {
    const summary = summarizeFailure(result.error);
    const detail = summary.correlationId !== null ? ` (correlation id ${summary.correlationId})` : '';
    return (
      <Badge tone="danger" title={`${summary.message}${detail}`}>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-danger" />
        API unavailable
      </Badge>
    );
  }
  const health = result.data;
  const databaseUp = health.database === 'up';
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="API status">
      <Badge tone={databaseUp ? 'success' : 'warning'} title={`API version ${health.version}`}>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${databaseUp ? 'bg-success' : 'bg-warning'}`} />
        {databaseUp ? 'API online' : 'Database down'}
      </Badge>
      <Badge tone={health.provider === 'gemini' ? 'ai' : 'heuristic'} title="Engine the API uses for AI features">
        {providerLabel({ provider: health.provider })}
      </Badge>
    </div>
  );
}

export function HealthStatusFallback() {
  return (
    <Badge tone="neutral">
      <span className="sr-only">Checking API status</span>
      <span aria-hidden="true">Checking API...</span>
    </Badge>
  );
}
